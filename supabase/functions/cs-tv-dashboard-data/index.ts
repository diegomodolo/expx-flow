import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendantPerformance {
  id: string;
  name: string;
  avatarUrl: string | null;
  activeConversations: number;
  averageScore: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  activeAlerts: number;
  messagesSent: number;
  averageResponseTimeMinutes: number | null;
  averageFirstResponseTimeMinutes: number | null;
}

interface CSTVDashboardData {
  companyName: string;
  lastUpdatedAt: string;
  healthMetrics: {
    averageHealthScore: number;
    totalClients: number;
    criticalClients: number;
    highRiskClients: number;
    mediumRiskClients: number;
    lowRiskClients: number;
    averageNPS: number | null;
    npsPromoters: number;
    npsPassives: number;
    npsDetractors: number;
  };
  whatsappSentiment: {
    totalConversations: number;
    positiveConversations: number;
    neutralConversations: number;
    negativeConversations: number;
    averageScore: number | null;
    activeAlerts: number;
    averageResponseTimeMinutes: number | null;
    averageFirstResponseTimeMinutes: number | null;
  };
  criticalClients: Array<{
    id: string;
    name: string;
    avatar: string | null;
    healthScore: number | null;
    riskLevel: string;
    financialScore: number | null;
    operationalScore: number | null;
    relationalScore: number | null;
    npsScore: number | null;
    lastCsContact: string | null;
  }>;
  criticalConversations: Array<{
    id: string;
    contactName: string;
    clientId: string | null;
    clientName: string | null;
    score: number | null;
    temperature: string | null;
    alertsCount: number;
    lastAnalysis: string | null;
  }>;
  pendingContacts: Array<{
    id: string;
    name: string;
    avatar: string | null;
    daysSinceContact: number;
    lastContactAt: string | null;
  }>;
  pendingNPS: Array<{
    id: string;
    name: string;
    avatar: string | null;
    daysSinceNPS: number;
    lastNPSAt: string | null;
  }>;
  attendantPerformance: AttendantPerformance[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      console.error('No token provided');
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token and get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('cs_tv_dashboard_token', token)
      .single();

    if (companyError || !company) {
      console.error('Invalid token:', companyError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching CS TV data for company:', company.name);

    // Fetch all data in parallel
    const [
      healthConfigsResult,
      whatsappAnalysisResult,
      conversationsResult,
      instancesResult,
      clientsResult,
      assignmentsResult,
      messagesCountResult,
      instanceUsersResult,
      allMessagesResult,
    ] = await Promise.all([
      // Client health configs
      supabase
        .from('client_health_config')
        .select(`
          *,
          clients!inner(id, name, avatar)
        `)
        .eq('company_id', company.id),

      // WhatsApp realtime analysis
      supabase
        .from('whatsapp_realtime_analysis')
        .select(`
          *,
          whatsapp_conversations!inner(id, contact_name, client_id, instance_id)
        `)
        .eq('company_id', company.id),

      // WhatsApp conversations count
      supabase
        .from('whatsapp_conversations')
        // NOTE: whatsapp_conversations does NOT have a `status` column
        .select('id, contact_name, client_id, instance_id')
        .eq('company_id', company.id),

      // WhatsApp instances (to scope instance users to this company)
      supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('company_id', company.id),

      // All clients for pending contacts calculation
      supabase
        .from('clients')
        .select('id, name, avatar')
        .eq('company_id', company.id),

      // Conversation assignments for attendant performance
      supabase
        .from('whatsapp_conversation_assignments')
        .select('conversation_id, assigned_to_user_id')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .not('assigned_to_user_id', 'is', null),

      // Messages sent count by user
      supabase
        .from('whatsapp_messages')
        .select('sent_by_user_id')
        .eq('company_id', company.id)
        .not('sent_by_user_id', 'is', null),

      // Instance users for fallback attendant performance (only official attendants)
      supabase
        .from('whatsapp_instance_users')
        .select('instance_id, user_id')
        .eq('is_attendant', true),

      // All messages for response time calculation (last 7 days)
      supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, direction, sent_at, sent_by_user_id')
        .eq('company_id', company.id)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: true }),
    ]);

    const healthConfigs = healthConfigsResult.data || [];
    const whatsappAnalysis = whatsappAnalysisResult.data || [];
    const conversations = conversationsResult.data || [];
    const instances = instancesResult.data || [];
    const clients = clientsResult.data || [];
    const assignments = assignmentsResult.data || [];
    const messagesSent = messagesCountResult.data || [];
    const instanceUsers = instanceUsersResult.data || [];
    const allMessages = allMessagesResult.data || [];

    // Scope instance users to company instances (table doesn't have company_id)
    const instanceIds = new Set<string>(instances.map((i: any) => i.id));
    const instanceUsersForCompany = instanceUsers.filter((iu: any) => instanceIds.has(iu.instance_id));

    console.log('Data fetched:', {
      healthConfigs: healthConfigs.length,
      whatsappAnalysis: whatsappAnalysis.length,
      conversations: conversations.length,
      instances: instances.length,
      clients: clients.length,
      assignments: assignments.length,
      messagesSent: messagesSent.length,
      instanceUsers: instanceUsersForCompany.length,
      allMessages: allMessages.length,
    });

    // ========== CALCULATE RESPONSE TIMES ==========
    // Group messages by conversation
    const messagesByConversation = new Map<string, any[]>();
    allMessages.forEach((m: any) => {
      if (!messagesByConversation.has(m.conversation_id)) {
        messagesByConversation.set(m.conversation_id, []);
      }
      messagesByConversation.get(m.conversation_id)!.push(m);
    });

    // Helper function to get date string (YYYY-MM-DD) from timestamp
    const getDateKey = (timestamp: string): string => {
      return new Date(timestamp).toISOString().split('T')[0];
    };

    // Calculate response times per conversation and per user
    // Separate: all responses vs first response of the day
    const allResponseTimesGlobal: number[] = [];
    const firstResponseTimesGlobal: number[] = [];
    const allResponseTimesByUser = new Map<string, number[]>();
    const firstResponseTimesByUser = new Map<string, number[]>();

    for (const [conversationId, messages] of messagesByConversation) {
      // Sort by sent_at
      messages.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
      
      // Track first response per day per conversation
      const firstResponseTracked = new Set<string>(); // "conversationId_YYYY-MM-DD"
      
      for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i];
        const next = messages[i + 1];
        
        // If current is incoming (from customer) and next is outgoing (from company), this is a response
        // Support both naming conventions: inbound/outbound and incoming/outgoing
        const isCurrentIncoming = current.direction === 'inbound' || current.direction === 'incoming';
        const isNextOutgoing = next.direction === 'outbound' || next.direction === 'outgoing';
        
        if (isCurrentIncoming && isNextOutgoing) {
          const responseTimeMs = new Date(next.sent_at).getTime() - new Date(current.sent_at).getTime();
          const responseTimeMinutes = responseTimeMs / (1000 * 60);
          
          // Only count responses under 24 hours (filter out old conversations)
          if (responseTimeMinutes > 0 && responseTimeMinutes < 24 * 60) {
            // Check if this is the first response of the day for this conversation
            const dayKey = getDateKey(current.sent_at);
            const trackingKey = `${conversationId}_${dayKey}`;
            const isFirstOfDay = !firstResponseTracked.has(trackingKey);
            
            if (isFirstOfDay) {
              firstResponseTracked.add(trackingKey);
              firstResponseTimesGlobal.push(responseTimeMinutes);
            }
            
            // Always add to all responses
            allResponseTimesGlobal.push(responseTimeMinutes);
            
            // Track per user if available
            if (next.sent_by_user_id) {
              // All responses
              if (!allResponseTimesByUser.has(next.sent_by_user_id)) {
                allResponseTimesByUser.set(next.sent_by_user_id, []);
              }
              allResponseTimesByUser.get(next.sent_by_user_id)!.push(responseTimeMinutes);
              
              // First response of day
              if (isFirstOfDay) {
                if (!firstResponseTimesByUser.has(next.sent_by_user_id)) {
                  firstResponseTimesByUser.set(next.sent_by_user_id, []);
                }
                firstResponseTimesByUser.get(next.sent_by_user_id)!.push(responseTimeMinutes);
              }
            }
            
            // Also associate with attendants assigned to this conversation (fallback)
            // Find which users are assigned to this conversation via instance_users
            const conversation = conversations.find((c: any) => c.id === conversationId);
            if (conversation?.instance_id) {
              const assignedUsers = instanceUsersForCompany
                .filter((iu: any) => iu.instance_id === conversation.instance_id)
                .map((iu: any) => iu.user_id);
              
              for (const userId of assignedUsers) {
                // Only add if not already tracked via sent_by_user_id
                if (!next.sent_by_user_id) {
                  // All responses
                  if (!allResponseTimesByUser.has(userId)) {
                    allResponseTimesByUser.set(userId, []);
                  }
                  allResponseTimesByUser.get(userId)!.push(responseTimeMinutes);
                  
                  // First response of day
                  if (isFirstOfDay) {
                    if (!firstResponseTimesByUser.has(userId)) {
                      firstResponseTimesByUser.set(userId, []);
                    }
                    firstResponseTimesByUser.get(userId)!.push(responseTimeMinutes);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Calculate global averages
    const globalAverageResponseTime = allResponseTimesGlobal.length > 0
      ? Math.round(allResponseTimesGlobal.reduce((a, b) => a + b, 0) / allResponseTimesGlobal.length)
      : null;

    const globalAverageFirstResponseTime = firstResponseTimesGlobal.length > 0
      ? Math.round(firstResponseTimesGlobal.reduce((a, b) => a + b, 0) / firstResponseTimesGlobal.length)
      : null;

    console.log('Response times calculated:', {
      allResponsesSamples: allResponseTimesGlobal.length,
      allResponsesAverage: globalAverageResponseTime,
      firstResponseSamples: firstResponseTimesGlobal.length,
      firstResponseAverage: globalAverageFirstResponseTime,
      usersWithData: allResponseTimesByUser.size,
    });

    // Calculate health metrics
    const totalClients = healthConfigs.length;
    const criticalClients = healthConfigs.filter(h => h.churn_risk_level === 'critical').length;
    const highRiskClients = healthConfigs.filter(h => h.churn_risk_level === 'high').length;
    const mediumRiskClients = healthConfigs.filter(h => h.churn_risk_level === 'medium').length;
    const lowRiskClients = healthConfigs.filter(h => h.churn_risk_level === 'low').length;

    const healthScores = healthConfigs
      .map(h => h.health_score_total)
      .filter((s): s is number => s !== null);
    const averageHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    // Calculate NPS metrics
    const npsScores = healthConfigs
      .map(h => h.nps_score)
      .filter((s): s is number => s !== null);
    const averageNPS = npsScores.length > 0
      ? Math.round((npsScores.reduce((a, b) => a + b, 0) / npsScores.length) * 10) / 10
      : null;
    const npsPromoters = npsScores.filter(s => s >= 9).length;
    const npsPassives = npsScores.filter(s => s >= 7 && s < 9).length;
    const npsDetractors = npsScores.filter(s => s < 7).length;

    // Calculate WhatsApp sentiment metrics
    const positiveConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'positive' || (w as any).sentiment === 'positive'
    ).length;
    const neutralConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'neutral' || (w as any).sentiment === 'neutral'
    ).length;
    const negativeConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'negative' || (w as any).sentiment === 'negative'
    ).length;

    const analysisScores = whatsappAnalysis
      .map(w => (w as any).score)
      .filter((s): s is number => typeof s === 'number');
    const averageWhatsAppScore = analysisScores.length > 0
      ? Math.round((analysisScores.reduce((a, b) => a + b, 0) / analysisScores.length) * 10) / 10
      : null;

    const activeAlerts = whatsappAnalysis.reduce((count, w) => {
      const alerts = (w as any).alerts;
      if (Array.isArray(alerts)) {
        return count + alerts.length;
      }
      return count;
    }, 0);

    // ========== ATTENDANT PERFORMANCE ==========
    // Group conversations by attendant
    const attendantConversations = new Map<string, string[]>();
    
    // Try primary source: direct conversation assignments
    assignments.forEach((a: any) => {
      const userId = a.assigned_to_user_id;
      if (!attendantConversations.has(userId)) {
        attendantConversations.set(userId, []);
      }
      attendantConversations.get(userId)!.push(a.conversation_id);
    });

    // Fallback: if no direct assignments, use instance_users (scoped to this company)
    if (attendantConversations.size === 0 && instanceUsersForCompany.length > 0) {
      console.log('Using instance_users fallback for attendant performance');
      
      // Group conversations by instance
      const conversationsByInstance = new Map<string, string[]>();
      conversations.forEach((c: any) => {
        if (c.instance_id) {
          if (!conversationsByInstance.has(c.instance_id)) {
            conversationsByInstance.set(c.instance_id, []);
          }
          conversationsByInstance.get(c.instance_id)!.push(c.id);
        }
      });

      // Associate users to their instance conversations
      instanceUsersForCompany.forEach((iu: any) => {
        const convIds = conversationsByInstance.get(iu.instance_id) || [];
        if (convIds.length > 0) {
          if (!attendantConversations.has(iu.user_id)) {
            attendantConversations.set(iu.user_id, []);
          }
          // Add unique conversation IDs
          convIds.forEach(id => {
            if (!attendantConversations.get(iu.user_id)!.includes(id)) {
              attendantConversations.get(iu.user_id)!.push(id);
            }
          });
        }
      });
      
      console.log('Attendants found via instance_users:', attendantConversations.size);
    }

    // Count messages sent per user
    const messageCounts = new Map<string, number>();
    messagesSent.forEach((m: any) => {
      const userId = m.sent_by_user_id;
      messageCounts.set(userId, (messageCounts.get(userId) || 0) + 1);
    });

    // Calculate metrics per attendant
    const attendantMetrics: Array<{
      id: string;
      activeConversations: number;
      averageScore: number | null;
      positiveCount: number;
      neutralCount: number;
      negativeCount: number;
      activeAlerts: number;
      messagesSent: number;
      averageResponseTimeMinutes: number | null;
      averageFirstResponseTimeMinutes: number | null;
    }> = [];

    for (const [userId, convIds] of attendantConversations) {
      // Filter analyses for this attendant's conversations
      const attendantAnalyses = whatsappAnalysis.filter((a: any) => 
        convIds.includes(a.conversation_id)
      );

      // Calculate sentiment counts
      const positiveCount = attendantAnalyses.filter((a: any) => 
        a.temperature === 'positive' || a.sentiment === 'positive'
      ).length;
      const neutralCount = attendantAnalyses.filter((a: any) => 
        a.temperature === 'neutral' || a.sentiment === 'neutral'
      ).length;
      const negativeCount = attendantAnalyses.filter((a: any) => 
        a.temperature === 'negative' || a.sentiment === 'negative'
      ).length;

      // Calculate average score
      const scores = attendantAnalyses
        .map((a: any) => a.score)
        .filter((s: any): s is number => typeof s === 'number');
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
        : null;

      // Count alerts
      const alertCount = attendantAnalyses.reduce((count: number, a: any) => {
        if (Array.isArray(a.alerts)) {
          return count + a.alerts.length;
        }
        return count;
      }, 0);

      // Calculate average response time for this user (all responses)
      const userAllResponseTimes = allResponseTimesByUser.get(userId) || [];
      const avgResponseTime = userAllResponseTimes.length > 0
        ? Math.round(userAllResponseTimes.reduce((a, b) => a + b, 0) / userAllResponseTimes.length)
        : null;

      // Calculate average first response time for this user
      const userFirstResponseTimes = firstResponseTimesByUser.get(userId) || [];
      const avgFirstResponseTime = userFirstResponseTimes.length > 0
        ? Math.round(userFirstResponseTimes.reduce((a, b) => a + b, 0) / userFirstResponseTimes.length)
        : null;

      attendantMetrics.push({
        id: userId,
        activeConversations: convIds.length,
        averageScore: avgScore,
        positiveCount,
        neutralCount,
        negativeCount,
        activeAlerts: alertCount,
        messagesSent: messageCounts.get(userId) || 0,
        averageResponseTimeMinutes: avgResponseTime,
        averageFirstResponseTimeMinutes: avgFirstResponseTime,
      });
    }

    // Fetch profiles and employees for attendants
    const userIds = [...attendantConversations.keys()];
    let profiles: any[] = [];
    let employees: any[] = [];
    
    console.log('Looking up names for userIds:', userIds, 'company.id:', company.id);
    
    if (userIds.length > 0) {
      // Fetch from profiles table (uses full_name, not name)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      profiles = profilesData || [];
      console.log('Profiles fetched:', profiles.length, JSON.stringify(profiles));
      
      // Fetch from employees table - get any employee matching user_id
      // (don't filter by company_id since employees might be in a different company record)
      // Note: employees table doesn't have avatar_url column
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('user_id, name, company_id')
        .in('user_id', userIds);
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      }
      employees = employeesData || [];
      console.log('Employees fetched:', employees.length, JSON.stringify(employees));
    }

    // Build attendant performance list with names
    const attendantPerformance: AttendantPerformance[] = attendantMetrics
      .map(metrics => {
        // Find name from employees first (company-specific), then profiles
        const employee = employees.find(e => e.user_id === metrics.id);
        const profile = profiles.find(p => p.id === metrics.id);
        
        // profiles uses full_name, employees uses name
        // Note: employees table doesn't have avatar_url, only profiles does
        const name = employee?.name || profile?.full_name || 'Sem nome';
        const avatarUrl = profile?.avatar_url || null;
        
        console.log('Building attendant:', { userId: metrics.id, employeeName: employee?.name, profileName: profile?.full_name, finalName: name });
        
        return {
          ...metrics,
          name,
          avatarUrl,
        };
      })
      .filter(a => a.activeConversations > 0 || a.messagesSent > 0)
      .sort((a, b) => {
        // Sort by score (highest first), then by conversations
        if (a.averageScore !== null && b.averageScore !== null) {
          return b.averageScore - a.averageScore;
        }
        if (a.averageScore !== null) return -1;
        if (b.averageScore !== null) return 1;
        return b.activeConversations - a.activeConversations;
      });

    // Get critical clients (churn risk = critical or high)
    const criticalClientsList = healthConfigs
      .filter(h => h.churn_risk_level === 'critical' || h.churn_risk_level === 'high')
      .map(h => ({
        id: (h.clients as any).id,
        name: (h.clients as any).name,
        avatar: (h.clients as any).avatar,
        healthScore: h.health_score_total,
        riskLevel: h.churn_risk_level || 'unknown',
        financialScore: h.health_score_financial,
        operationalScore: h.health_score_operational,
        relationalScore: h.health_score_relational,
        npsScore: h.nps_score,
        lastCsContact: h.last_cs_contact_at,
      }))
      .sort((a, b) => {
        // Critical first, then by health score (lowest first)
        if (a.riskLevel === 'critical' && b.riskLevel !== 'critical') return -1;
        if (a.riskLevel !== 'critical' && b.riskLevel === 'critical') return 1;
        return (a.healthScore || 0) - (b.healthScore || 0);
      })
      .slice(0, 10);

    // Get critical conversations (negative sentiment or low score)
    const criticalConversationsList = whatsappAnalysis
      .filter(w => {
        const temp = (w as any).temperature || (w as any).sentiment;
        const score = (w as any).score;
        return temp === 'negative' || (typeof score === 'number' && score < 5);
      })
      .map(w => {
        const conv = (w as any).whatsapp_conversations;
        const alerts = (w as any).alerts;
        return {
          id: conv.id,
          contactName: conv.contact_name || 'Sem nome',
          clientId: conv.client_id,
          clientName: null as string | null, // Will be enriched below
          score: (w as any).score,
          temperature: (w as any).temperature || (w as any).sentiment,
          alertsCount: Array.isArray(alerts) ? alerts.length : 0,
          lastAnalysis: (w as any).analyzed_at || (w as any).updated_at,
        };
      })
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .slice(0, 10);

    // Enrich with client names
    const clientIds = criticalConversationsList
      .map(c => c.clientId)
      .filter((id): id is string => id !== null);
    
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
      
      if (clientsData) {
        criticalConversationsList.forEach(conv => {
          if (conv.clientId) {
            const client = clientsData.find(c => c.id === conv.clientId);
            if (client) {
              conv.clientName = client.name;
            }
          }
        });
      }
    }

    // Calculate pending contacts (clients without recent CS contact)
    const now = new Date();
    const pendingContacts = healthConfigs
      .filter(h => {
        if (!h.last_cs_contact_at) return true;
        const daysSince = Math.floor((now.getTime() - new Date(h.last_cs_contact_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= 14; // 2 weeks threshold
      })
      .map(h => {
        const lastContact = h.last_cs_contact_at ? new Date(h.last_cs_contact_at) : null;
        const daysSince = lastContact
          ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return {
          id: (h.clients as any).id,
          name: (h.clients as any).name,
          avatar: (h.clients as any).avatar,
          daysSinceContact: daysSince,
          lastContactAt: h.last_cs_contact_at,
        };
      })
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
      .slice(0, 10);

    // Calculate pending NPS (clients without recent NPS)
    const pendingNPS = healthConfigs
      .filter(h => {
        if (!h.nps_collected_at) return true;
        const daysSince = Math.floor((now.getTime() - new Date(h.nps_collected_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= 90; // 3 months threshold
      })
      .map(h => {
        const lastNPS = h.nps_collected_at ? new Date(h.nps_collected_at) : null;
        const daysSince = lastNPS
          ? Math.floor((now.getTime() - lastNPS.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return {
          id: (h.clients as any).id,
          name: (h.clients as any).name,
          avatar: (h.clients as any).avatar,
          daysSinceNPS: daysSince,
          lastNPSAt: h.nps_collected_at,
        };
      })
      .sort((a, b) => b.daysSinceNPS - a.daysSinceNPS)
      .slice(0, 10);

    // Build response
    const dashboardData: CSTVDashboardData = {
      companyName: company.name,
      lastUpdatedAt: new Date().toISOString(),
      healthMetrics: {
        averageHealthScore,
        totalClients,
        criticalClients,
        highRiskClients,
        mediumRiskClients,
        lowRiskClients,
        averageNPS,
        npsPromoters,
        npsPassives,
        npsDetractors,
      },
      whatsappSentiment: {
        totalConversations: conversations.length,
        positiveConversations,
        neutralConversations,
        negativeConversations,
        averageScore: averageWhatsAppScore,
        activeAlerts,
        averageResponseTimeMinutes: globalAverageResponseTime,
        averageFirstResponseTimeMinutes: globalAverageFirstResponseTime,
      },
      criticalClients: criticalClientsList,
      criticalConversations: criticalConversationsList,
      pendingContacts,
      pendingNPS,
      attendantPerformance,
    };

    console.log('Dashboard data prepared:', {
      healthMetrics: dashboardData.healthMetrics,
      whatsappSentiment: dashboardData.whatsappSentiment,
      criticalClients: dashboardData.criticalClients.length,
      criticalConversations: dashboardData.criticalConversations.length,
      pendingContacts: dashboardData.pendingContacts.length,
      pendingNPS: dashboardData.pendingNPS.length,
      attendantPerformance: dashboardData.attendantPerformance.length,
    });

    return new Response(
      JSON.stringify(dashboardData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cs-tv-dashboard-data:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
