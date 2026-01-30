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

interface CriticalAlert {
  id: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
  score: number;
  temperature: string;
  interpretation: string | null;
  suggestion: string | null;
  analyzedAt: string;
}

interface CelebrationAlert {
  id: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
  squadName: string | null;
  score: number;
  temperature: string;
  interpretation: string | null;
  lastClientMessage: string | null;
  analyzedAt: string;
}

interface CSTVDashboardData {
  companyName: string;
  lastUpdatedAt: string;
  whatsappMetrics: {
    totalConversations: number;
    activeConversations: number;
    positiveConversations: number;
    neutralConversations: number;
    negativeConversations: number;
    averageScore: number | null;
    activeAlerts: number;
    averageResponseTimeMinutes: number | null;
    averageFirstResponseTimeMinutes: number | null;
    totalMessagesToday: number;
    totalMessagesThisWeek: number;
    conversationsWithoutResponse: number;
    conversationsNeedingAttention: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  criticalConversations: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    clientId: string | null;
    clientName: string | null;
    score: number | null;
    temperature: string | null;
    alertsCount: number;
    interpretation: string | null;
    lastAnalysis: string | null;
    lastMessageAt: string | null;
    attendantId: string | null;
    attendantName: string | null;
  }>;
  recentCriticalAlerts: CriticalAlert[];
  recentCelebrationAlerts: CelebrationAlert[];
  attendantPerformance: AttendantPerformance[];
  hourlyMessageVolume: Array<{
    hour: number;
    inbound: number;
    outbound: number;
  }>;
  hourlySentimentVolume: Array<{
    hour: number;
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number | null;
    totalAnalyses: number;
  }>;
  responseTimeBreakdown: {
    under5min: number;
    under15min: number;
    under30min: number;
    under1hour: number;
    over1hour: number;
  };
  pendingConversations: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    lastMessageAt: string;
    waitingMinutes: number;
    clientName: string | null;
  }>;
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

    console.log('Fetching CS TV WhatsApp data for company:', company.name);

    // Helper to get São Paulo time (UTC-3)
    const getSaoPauloTime = (date: Date = new Date()): Date => {
      // Get UTC time and subtract 3 hours for São Paulo
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      return new Date(utc - (3 * 60 * 60 * 1000));
    };

    const getSaoPauloHour = (dateStr: string): number => {
      const date = new Date(dateStr);
      const saoPauloDate = getSaoPauloTime(date);
      return saoPauloDate.getHours();
    };

    const now = new Date();
    const saoPauloNow = getSaoPauloTime(now);
    
    // Today start in São Paulo timezone
    const todayStartSaoPaulo = new Date(saoPauloNow);
    todayStartSaoPaulo.setHours(0, 0, 0, 0);
    // Convert back to UTC for database query
    const todayStartUTC = new Date(todayStartSaoPaulo.getTime() + (3 * 60 * 60 * 1000));
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Fetch all data in parallel
    const [
      whatsappAnalysisResult,
      conversationsResult,
      totalConversationsCountResult,
      activeConversationsCountResult,
      instancesResult,
      assignmentsResult,
      messagesCountResult,
      instanceUsersResult,
      allMessagesResult,
      todayMessagesDataResult,
      weekMessagesCountResult,
      todayMessagesCountResult,
      todaySentimentHistoryResult,
    ] = await Promise.all([
      // WhatsApp realtime analysis
      supabase
        .from('whatsapp_realtime_analysis')
        .select(`
          *,
          whatsapp_conversations!inner(id, contact_name, phone, client_id, instance_id, last_message_at, is_archived)
        `)
        .eq('company_id', company.id),

      // WhatsApp conversations - with high limit
      supabase
        .from('whatsapp_conversations')
        .select('id, contact_name, phone, client_id, instance_id, last_message_at, is_archived, unread_count')
        .eq('company_id', company.id)
        .limit(50000),
      
      // Total conversations count (exact)
      supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id),
      
      // Active conversations count (exact)
      supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_archived', false),

      // WhatsApp instances (to scope instance users to this company)
      supabase
        .from('whatsapp_instances')
        .select('id')
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
        .not('sent_by_user_id', 'is', null)
        .limit(50000),

      // Instance users for fallback attendant lookup (get all, prioritize is_attendant)
      supabase
        .from('whatsapp_instance_users')
        .select('instance_id, user_id, is_attendant'),

      // All messages for response time calculation (last 7 days) - limit for performance
      supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, direction, sent_at, sent_by_user_id')
        .eq('company_id', company.id)
        .gte('sent_at', weekStart.toISOString())
        .order('sent_at', { ascending: true })
        .limit(20000),

      // Today's messages with sent_at for hourly chart (using São Paulo timezone)
      supabase
        .from('whatsapp_messages')
        .select('id, direction, sent_at')
        .eq('company_id', company.id)
        .gte('sent_at', todayStartUTC.toISOString())
        .limit(50000),

      // This week's messages count
      supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('sent_at', weekStart.toISOString()),

      // Today's messages count (using São Paulo timezone)
      supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('sent_at', todayStartUTC.toISOString()),
      
      // Today's sentiment analysis history (for hourly sentiment chart)
      supabase
        .from('whatsapp_realtime_analysis_history')
        .select('temperature, score, analyzed_at')
        .eq('company_id', company.id)
        .gte('analyzed_at', todayStartUTC.toISOString())
        .order('analyzed_at', { ascending: true }),
    ]);

    const whatsappAnalysis = whatsappAnalysisResult.data || [];
    const conversations = conversationsResult.data || [];
    const totalConversationsCount = totalConversationsCountResult.count || 0;
    const activeConversationsCount = activeConversationsCountResult.count || 0;
    const instances = instancesResult.data || [];
    const assignments = assignmentsResult.data || [];
    const messagesSent = messagesCountResult.data || [];
    const instanceUsers = instanceUsersResult.data || [];
    const allMessages = allMessagesResult.data || [];
    const todayMessagesData = todayMessagesDataResult.data || [];
    const weekMessagesCount = weekMessagesCountResult.count || 0;
    const todayMessagesCount = todayMessagesCountResult.count || 0;
    const todaySentimentHistory = todaySentimentHistoryResult.data || [];

    // Scope instance users to company instances (table doesn't have company_id)
    const instanceIds = new Set<string>(instances.map((i: any) => i.id));
    const instanceUsersForCompany = instanceUsers.filter((iu: any) => instanceIds.has(iu.instance_id));

    // Helper function to find attendant for a given instance
    // Priority: 1) is_attendant = true, 2) any user from instance
    const findInstanceAttendant = (instanceId: string): string | null => {
      // First try to find official attendant
      const officialAttendant = instanceUsersForCompany.find((iu: any) => 
        iu.instance_id === instanceId && iu.is_attendant === true
      );
      if (officialAttendant) {
        return officialAttendant.user_id;
      }
      // Fallback to any user from the instance
      const anyUser = instanceUsersForCompany.find((iu: any) => 
        iu.instance_id === instanceId
      );
      return anyUser?.user_id || null;
    };

    console.log('Data fetched:', {
      whatsappAnalysis: whatsappAnalysis.length,
      conversations: conversations.length,
      totalConversationsCount,
      activeConversationsCount,
      instances: instances.length,
      assignments: assignments.length,
      messagesSent: messagesSent.length,
      instanceUsers: instanceUsersForCompany.length,
      allMessages: allMessages.length,
      todayMessagesData: todayMessagesData.length,
      todayMessagesCount,
      weekMessagesCount,
    });

    // ========== CALCULATE RESPONSE TIMES ==========
    const messagesByConversation = new Map<string, any[]>();
    allMessages.forEach((m: any) => {
      if (!messagesByConversation.has(m.conversation_id)) {
        messagesByConversation.set(m.conversation_id, []);
      }
      messagesByConversation.get(m.conversation_id)!.push(m);
    });

    const getDateKey = (timestamp: string): string => {
      return new Date(timestamp).toISOString().split('T')[0];
    };

    const allResponseTimesGlobal: number[] = [];
    const firstResponseTimesGlobal: number[] = [];
    const allResponseTimesByUser = new Map<string, number[]>();
    const firstResponseTimesByUser = new Map<string, number[]>();
    const responseTimeBreakdown = { under5min: 0, under15min: 0, under30min: 0, under1hour: 0, over1hour: 0 };

    for (const [conversationId, messages] of messagesByConversation) {
      messages.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
      
      const firstResponseTracked = new Set<string>();
      
      for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i];
        const next = messages[i + 1];
        
        const isCurrentIncoming = current.direction === 'inbound' || current.direction === 'incoming';
        const isNextOutgoing = next.direction === 'outbound' || next.direction === 'outgoing';
        
        if (isCurrentIncoming && isNextOutgoing) {
          const responseTimeMs = new Date(next.sent_at).getTime() - new Date(current.sent_at).getTime();
          const responseTimeMinutes = responseTimeMs / (1000 * 60);
          
          if (responseTimeMinutes > 0 && responseTimeMinutes < 24 * 60) {
            const dayKey = getDateKey(current.sent_at);
            const trackingKey = `${conversationId}_${dayKey}`;
            const isFirstOfDay = !firstResponseTracked.has(trackingKey);
            
            if (isFirstOfDay) {
              firstResponseTracked.add(trackingKey);
              firstResponseTimesGlobal.push(responseTimeMinutes);
            }
            
            allResponseTimesGlobal.push(responseTimeMinutes);
            
            // Response time breakdown
            if (responseTimeMinutes < 5) responseTimeBreakdown.under5min++;
            else if (responseTimeMinutes < 15) responseTimeBreakdown.under15min++;
            else if (responseTimeMinutes < 30) responseTimeBreakdown.under30min++;
            else if (responseTimeMinutes < 60) responseTimeBreakdown.under1hour++;
            else responseTimeBreakdown.over1hour++;
            
            if (next.sent_by_user_id) {
              if (!allResponseTimesByUser.has(next.sent_by_user_id)) {
                allResponseTimesByUser.set(next.sent_by_user_id, []);
              }
              allResponseTimesByUser.get(next.sent_by_user_id)!.push(responseTimeMinutes);
              
              if (isFirstOfDay) {
                if (!firstResponseTimesByUser.has(next.sent_by_user_id)) {
                  firstResponseTimesByUser.set(next.sent_by_user_id, []);
                }
                firstResponseTimesByUser.get(next.sent_by_user_id)!.push(responseTimeMinutes);
              }
            }
          }
        }
      }
    }

    const globalAverageResponseTime = allResponseTimesGlobal.length > 0
      ? Math.round(allResponseTimesGlobal.reduce((a, b) => a + b, 0) / allResponseTimesGlobal.length)
      : null;

    const globalAverageFirstResponseTime = firstResponseTimesGlobal.length > 0
      ? Math.round(firstResponseTimesGlobal.reduce((a, b) => a + b, 0) / firstResponseTimesGlobal.length)
      : null;

    // ========== HOURLY MESSAGE VOLUME (São Paulo timezone) ==========
    const hourlyVolume: Array<{ hour: number; inbound: number; outbound: number }> = [];
    for (let h = 0; h < 24; h++) {
      hourlyVolume.push({ hour: h, inbound: 0, outbound: 0 });
    }
    todayMessagesData.forEach((m: any) => {
      if (!m.sent_at) return;
      // Convert to São Paulo timezone hour
      const hour = getSaoPauloHour(m.sent_at);
      const isInbound = m.direction === 'inbound' || m.direction === 'incoming';
      if (isInbound) hourlyVolume[hour].inbound++;
      else hourlyVolume[hour].outbound++;
    });

    // ========== HOURLY SENTIMENT VOLUME (São Paulo timezone) ==========
    const hourlySentimentVolume: Array<{ 
      hour: number; 
      positive: number; 
      neutral: number; 
      negative: number; 
      avgScore: number | null;
      totalAnalyses: number;
    }> = [];
    for (let h = 0; h < 24; h++) {
      hourlySentimentVolume.push({ hour: h, positive: 0, neutral: 0, negative: 0, avgScore: null, totalAnalyses: 0 });
    }
    
    // Group analyses by hour
    const hourlyScores: Map<number, number[]> = new Map();
    todaySentimentHistory.forEach((analysis: any) => {
      if (!analysis.analyzed_at) return;
      const hour = getSaoPauloHour(analysis.analyzed_at);
      
      // Count by temperature
      if (analysis.temperature === 'positive') hourlySentimentVolume[hour].positive++;
      else if (analysis.temperature === 'neutral') hourlySentimentVolume[hour].neutral++;
      else if (analysis.temperature === 'negative') hourlySentimentVolume[hour].negative++;
      
      hourlySentimentVolume[hour].totalAnalyses++;
      
      // Collect scores for average calculation
      if (typeof analysis.score === 'number') {
        if (!hourlyScores.has(hour)) hourlyScores.set(hour, []);
        hourlyScores.get(hour)!.push(analysis.score);
      }
    });
    
    // Calculate average scores
    hourlyScores.forEach((scores, hour) => {
      if (scores.length > 0) {
        hourlySentimentVolume[hour].avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }
    });

    // ========== WHATSAPP METRICS ==========
    // Use exact counts from database
    
    const positiveConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'positive'
    ).length;
    const neutralConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'neutral'
    ).length;
    const negativeConversations = whatsappAnalysis.filter(w => 
      (w as any).temperature === 'negative'
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

    // Conversations without recent response (waiting for reply)
    const conversationsWithoutResponse = conversations.filter((c: any) => {
      if (c.is_archived) return false;
      const convMessages = messagesByConversation.get(c.id) || [];
      if (convMessages.length === 0) return false;
      const lastMessage = convMessages[convMessages.length - 1];
      return lastMessage.direction === 'inbound' || lastMessage.direction === 'incoming';
    }).length;

    // Conversations needing attention (negative or low score)
    const conversationsNeedingAttention = whatsappAnalysis.filter(w => {
      const temp = (w as any).temperature;
      const score = (w as any).score;
      return temp === 'negative' || (typeof score === 'number' && score < 5);
    }).length;

    // ========== ATTENDANT PERFORMANCE ==========
    const attendantConversations = new Map<string, string[]>();
    
    assignments.forEach((a: any) => {
      const userId = a.assigned_to_user_id;
      if (!attendantConversations.has(userId)) {
        attendantConversations.set(userId, []);
      }
      attendantConversations.get(userId)!.push(a.conversation_id);
    });

    if (attendantConversations.size === 0 && instanceUsersForCompany.length > 0) {
      const conversationsByInstance = new Map<string, string[]>();
      conversations.forEach((c: any) => {
        if (c.instance_id) {
          if (!conversationsByInstance.has(c.instance_id)) {
            conversationsByInstance.set(c.instance_id, []);
          }
          conversationsByInstance.get(c.instance_id)!.push(c.id);
        }
      });

      instanceUsersForCompany.forEach((iu: any) => {
        const convIds = conversationsByInstance.get(iu.instance_id) || [];
        if (convIds.length > 0) {
          if (!attendantConversations.has(iu.user_id)) {
            attendantConversations.set(iu.user_id, []);
          }
          convIds.forEach(id => {
            if (!attendantConversations.get(iu.user_id)!.includes(id)) {
              attendantConversations.get(iu.user_id)!.push(id);
            }
          });
        }
      });
    }

    const messageCounts = new Map<string, number>();
    messagesSent.forEach((m: any) => {
      const userId = m.sent_by_user_id;
      messageCounts.set(userId, (messageCounts.get(userId) || 0) + 1);
    });

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
      const attendantAnalyses = whatsappAnalysis.filter((a: any) => 
        convIds.includes(a.conversation_id)
      );

      const positiveCount = attendantAnalyses.filter((a: any) => a.temperature === 'positive').length;
      const neutralCount = attendantAnalyses.filter((a: any) => a.temperature === 'neutral').length;
      const negativeCount = attendantAnalyses.filter((a: any) => a.temperature === 'negative').length;

      const scores = attendantAnalyses
        .map((a: any) => a.score)
        .filter((s: any): s is number => typeof s === 'number');
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
        : null;

      const alertCount = attendantAnalyses.reduce((count: number, a: any) => {
        if (Array.isArray(a.alerts)) {
          return count + a.alerts.length;
        }
        return count;
      }, 0);

      const userAllResponseTimes = allResponseTimesByUser.get(userId) || [];
      const avgResponseTime = userAllResponseTimes.length > 0
        ? Math.round(userAllResponseTimes.reduce((a, b) => a + b, 0) / userAllResponseTimes.length)
        : null;

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
    
    if (userIds.length > 0) {
      const [profilesResult, employeesResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        supabase.from('employees').select('user_id, name, company_id').in('user_id', userIds),
      ]);
      profiles = profilesResult.data || [];
      employees = employeesResult.data || [];
    }

    const attendantPerformance: AttendantPerformance[] = attendantMetrics
      .map(metrics => {
        const employee = employees.find(e => e.user_id === metrics.id);
        const profile = profiles.find(p => p.id === metrics.id);
        const name = employee?.name || profile?.full_name || 'Sem nome';
        const avatarUrl = profile?.avatar_url || null;
        
        return { ...metrics, name, avatarUrl };
      })
      .filter(a => a.activeConversations > 0 || a.messagesSent > 0)
      .sort((a, b) => {
        if (a.averageScore !== null && b.averageScore !== null) {
          return b.averageScore - a.averageScore;
        }
        if (a.averageScore !== null) return -1;
        if (b.averageScore !== null) return 1;
        return b.activeConversations - a.activeConversations;
      });

    // ========== CRITICAL CONVERSATIONS ==========
    const criticalConversationsList = whatsappAnalysis
      .filter(w => {
        const temp = (w as any).temperature;
        const score = (w as any).score;
        return temp === 'negative' || (typeof score === 'number' && score < 5);
      })
      .map(w => {
        const conv = (w as any).whatsapp_conversations;
        const alerts = (w as any).alerts;
        
        // Find attendant - first check assignments, then fallback to instance attendant
        const assignment = assignments.find((a: any) => a.conversation_id === conv.id);
        let attendantId = assignment?.assigned_to_user_id || null;
        let attendantName: string | null = null;
        
        // If no direct assignment, find attendant from instance
        if (!attendantId && conv.instance_id) {
          attendantId = findInstanceAttendant(conv.instance_id);
        }
        
        if (attendantId) {
          const employee = employees.find(e => e.user_id === attendantId);
          const profile = profiles.find(p => p.id === attendantId);
          attendantName = employee?.name || profile?.full_name || null;
        }
        
        return {
          id: conv.id,
          contactName: conv.contact_name || 'Sem nome',
          contactPhone: conv.phone || '',
          clientId: conv.client_id,
          clientName: null as string | null,
          score: (w as any).score,
          temperature: (w as any).temperature,
          alertsCount: Array.isArray(alerts) ? alerts.length : 0,
          interpretation: (w as any).interpretation,
          lastAnalysis: (w as any).updated_at,
          lastMessageAt: conv.last_message_at,
          attendantId,
          attendantName,
        };
      })
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .slice(0, 15);

    // Enrich with client names
    const clientIds = criticalConversationsList.map(c => c.clientId).filter((id): id is string => id !== null);
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase.from('clients').select('id, name').in('id', clientIds);
      if (clientsData) {
        criticalConversationsList.forEach(conv => {
          if (conv.clientId) {
            const client = clientsData.find(c => c.id === conv.clientId);
            if (client) conv.clientName = client.name;
          }
        });
      }
    }

    // ========== RECENT CRITICAL ALERTS (score < 3) ==========
    const recentCriticalAlerts: CriticalAlert[] = whatsappAnalysis
      .filter(w => {
        const score = (w as any).score;
        return typeof score === 'number' && score < 3;
      })
      .map(w => {
        const conv = (w as any).whatsapp_conversations;
        
        // Find attendant - first check assignments, then fallback to instance attendant
        const assignment = assignments.find((a: any) => a.conversation_id === conv.id);
        let attendantId = assignment?.assigned_to_user_id || null;
        let attendantName: string | null = null;
        
        // If no direct assignment, find attendant from instance
        if (!attendantId && conv.instance_id) {
          attendantId = findInstanceAttendant(conv.instance_id);
        }
        
        if (attendantId) {
          const employee = employees.find(e => e.user_id === attendantId);
          const profile = profiles.find(p => p.id === attendantId);
          attendantName = employee?.name || profile?.full_name || null;
        }
        
        // Get client name
        let clientName: string | null = null;
        if (conv.client_id) {
          const existingConv = criticalConversationsList.find(c => c.clientId === conv.client_id);
          clientName = existingConv?.clientName || null;
        }
        
        return {
          id: (w as any).id,
          conversationId: conv.id,
          contactName: conv.contact_name || 'Sem nome',
          contactPhone: conv.phone || '',
          clientName,
          attendantId,
          attendantName,
          score: (w as any).score,
          temperature: (w as any).temperature,
          interpretation: (w as any).interpretation,
          suggestion: (w as any).suggestion,
          analyzedAt: (w as any).updated_at,
        };
      })
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
      .slice(0, 10);

    // ========== RECENT CELEBRATION ALERTS (score = 10) ==========
    // Fetch teams for squad names
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('company_id', company.id);
    const teams = teamsData || [];

    // Fetch employees with team_id
    const { data: employeesWithTeamsData } = await supabase
      .from('employees')
      .select('user_id, name, team_id')
      .eq('company_id', company.id);
    const employeesWithTeams = employeesWithTeamsData || [];

    // Get conversation IDs that might have score >= 9 (celebration)
    const celebrationConversationIds = whatsappAnalysis
      .filter(w => {
        const score = (w as any).score;
        return typeof score === 'number' && score >= 9;
      })
      .map(w => (w as any).whatsapp_conversations.id);

    // Fetch last inbound messages for celebration conversations
    let lastClientMessages: Map<string, string> = new Map();
    if (celebrationConversationIds.length > 0) {
      const { data: lastMessages } = await supabase
        .from('whatsapp_messages')
        .select('conversation_id, content')
        .in('conversation_id', celebrationConversationIds)
        .in('direction', ['inbound', 'incoming'])
        .order('sent_at', { ascending: false });
      
      if (lastMessages) {
        // Group by conversation_id and take first (most recent)
        lastMessages.forEach((msg: any) => {
          if (!lastClientMessages.has(msg.conversation_id)) {
            lastClientMessages.set(msg.conversation_id, msg.content || '');
          }
        });
      }
    }

    const recentCelebrationAlerts: CelebrationAlert[] = whatsappAnalysis
      .filter(w => {
        const score = (w as any).score;
        return typeof score === 'number' && score >= 9;
      })
      .map(w => {
        const conv = (w as any).whatsapp_conversations;
        
        // Find attendant - first check assignments, then fallback to instance attendant
        const assignment = assignments.find((a: any) => a.conversation_id === conv.id);
        let attendantId = assignment?.assigned_to_user_id || null;
        let attendantName: string | null = null;
        let squadName: string | null = null;
        
        // If no direct assignment, find attendant from instance
        if (!attendantId && conv.instance_id) {
          attendantId = findInstanceAttendant(conv.instance_id);
        }
        
        if (attendantId) {
          const employee = employeesWithTeams.find(e => e.user_id === attendantId);
          const profile = profiles.find(p => p.id === attendantId);
          attendantName = employee?.name || profile?.full_name || null;
          
          // Get squad name from employee's team
          if (employee?.team_id) {
            const team = teams.find(t => t.id === employee.team_id);
            squadName = team?.name || null;
          }
        }
        
        // Get client name
        let clientName: string | null = null;
        if (conv.client_id) {
          const existingConv = criticalConversationsList.find(c => c.clientId === conv.client_id);
          clientName = existingConv?.clientName || null;
        }

        // Get last client message
        const lastClientMessage = lastClientMessages.get(conv.id) || null;
        
        return {
          id: (w as any).id,
          conversationId: conv.id,
          contactName: conv.contact_name || 'Sem nome',
          contactPhone: conv.phone || '',
          clientName,
          attendantId,
          attendantName,
          squadName,
          score: (w as any).score,
          temperature: (w as any).temperature,
          interpretation: (w as any).interpretation,
          lastClientMessage,
          analyzedAt: (w as any).updated_at,
        };
      })
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
      .slice(0, 10);

    // ========== PENDING CONVERSATIONS (waiting for response) ==========
    const pendingConversations = conversations
      .filter((c: any) => {
        if (c.is_archived) return false;
        const convMessages = messagesByConversation.get(c.id) || [];
        if (convMessages.length === 0) return false;
        const lastMessage = convMessages[convMessages.length - 1];
        return lastMessage.direction === 'inbound' || lastMessage.direction === 'incoming';
      })
      .map((c: any) => {
        const convMessages = messagesByConversation.get(c.id) || [];
        const lastMessage = convMessages[convMessages.length - 1];
        const waitingMs = now.getTime() - new Date(lastMessage.sent_at).getTime();
        const waitingMinutes = Math.round(waitingMs / (1000 * 60));
        
        return {
          id: c.id,
          contactName: c.contact_name || 'Sem nome',
          contactPhone: c.phone || '',
          lastMessageAt: lastMessage.sent_at,
          waitingMinutes,
          clientName: null as string | null,
        };
      })
      .sort((a, b) => b.waitingMinutes - a.waitingMinutes)
      .slice(0, 15);

    // Enrich pending conversations with client names
    const pendingClientIds = conversations
      .filter((c: any) => pendingConversations.find(p => p.id === c.id))
      .map((c: any) => c.client_id)
      .filter((id): id is string => id !== null);
    
    if (pendingClientIds.length > 0) {
      const { data: pendingClientsData } = await supabase.from('clients').select('id, name').in('id', pendingClientIds);
      if (pendingClientsData) {
        pendingConversations.forEach(conv => {
          const conversation = conversations.find((c: any) => c.id === conv.id);
          if (conversation?.client_id) {
            const client = pendingClientsData.find(c => c.id === conversation.client_id);
            if (client) conv.clientName = client.name;
          }
        });
      }
    }

    // Build response
    const dashboardData: CSTVDashboardData = {
      companyName: company.name,
      lastUpdatedAt: new Date().toISOString(),
      whatsappMetrics: {
        totalConversations: totalConversationsCount,
        activeConversations: activeConversationsCount,
        positiveConversations,
        neutralConversations,
        negativeConversations,
        averageScore: averageWhatsAppScore,
        activeAlerts,
        averageResponseTimeMinutes: globalAverageResponseTime,
        averageFirstResponseTimeMinutes: globalAverageFirstResponseTime,
        totalMessagesToday: todayMessagesCount,
        totalMessagesThisWeek: weekMessagesCount,
        conversationsWithoutResponse,
        conversationsNeedingAttention,
      },
      sentimentDistribution: {
        positive: positiveConversations,
        neutral: neutralConversations,
        negative: negativeConversations,
      },
      criticalConversations: criticalConversationsList,
      recentCriticalAlerts,
      recentCelebrationAlerts,
      attendantPerformance,
      hourlyMessageVolume: hourlyVolume,
      hourlySentimentVolume,
      responseTimeBreakdown,
      pendingConversations,
    };

    console.log('Dashboard data prepared:', {
      whatsappMetrics: dashboardData.whatsappMetrics,
      criticalConversations: dashboardData.criticalConversations.length,
      recentCriticalAlerts: dashboardData.recentCriticalAlerts.length,
      recentCelebrationAlerts: dashboardData.recentCelebrationAlerts.length,
      attendantPerformance: dashboardData.attendantPerformance.length,
      pendingConversations: dashboardData.pendingConversations.length,
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
