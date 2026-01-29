import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      clientsResult,
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
          whatsapp_conversations!inner(id, contact_name, client_id)
        `)
        .eq('company_id', company.id),

      // WhatsApp conversations count
      supabase
        .from('whatsapp_conversations')
        .select('id, contact_name, client_id, status')
        .eq('company_id', company.id),

      // All clients for pending contacts calculation
      supabase
        .from('clients')
        .select('id, name, avatar')
        .eq('company_id', company.id),
    ]);

    const healthConfigs = healthConfigsResult.data || [];
    const whatsappAnalysis = whatsappAnalysisResult.data || [];
    const conversations = conversationsResult.data || [];
    const clients = clientsResult.data || [];

    console.log('Data fetched:', {
      healthConfigs: healthConfigs.length,
      whatsappAnalysis: whatsappAnalysis.length,
      conversations: conversations.length,
      clients: clients.length,
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

    // Get critical/high risk clients for the list
    const criticalClientsList = healthConfigs
      .filter(h => h.churn_risk_level === 'critical' || h.churn_risk_level === 'high')
      .map(h => ({
        id: h.client_id,
        name: (h.clients as any)?.name || 'Cliente',
        avatar: (h.clients as any)?.avatar || null,
        healthScore: h.health_score_total,
        riskLevel: h.churn_risk_level || 'unknown',
        financialScore: h.health_score_financial,
        operationalScore: h.health_score_operational,
        relationalScore: h.health_score_relational,
        npsScore: h.nps_score,
        lastCsContact: h.last_cs_contact_at,
      }))
      .sort((a, b) => (a.healthScore || 100) - (b.healthScore || 100))
      .slice(0, 10);

    // Get critical conversations (negative sentiment)
    const criticalConversationsList = whatsappAnalysis
      .filter(w => (w as any).temperature === 'negative' || (w as any).sentiment === 'negative')
      .map(w => {
        const conv = (w as any).whatsapp_conversations;
        const clientId = conv?.client_id;
        const client = clients.find(c => c.id === clientId);
        
        return {
          id: w.id,
          contactName: conv?.contact_name || 'Contato',
          clientId: clientId,
          clientName: client?.name || null,
          score: (w as any).score,
          temperature: (w as any).temperature || (w as any).sentiment,
          alertsCount: Array.isArray((w as any).alerts) ? (w as any).alerts.length : 0,
          lastAnalysis: w.updated_at,
        };
      })
      .slice(0, 10);

    // Calculate pending contacts (clients without CS contact in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingContactsList = healthConfigs
      .filter(h => {
        if (!h.last_cs_contact_at) return true;
        const lastContact = new Date(h.last_cs_contact_at);
        return lastContact < sevenDaysAgo;
      })
      .map(h => {
        const lastContact = h.last_cs_contact_at ? new Date(h.last_cs_contact_at) : null;
        const daysSinceContact = lastContact
          ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        return {
          id: h.client_id,
          name: (h.clients as any)?.name || 'Cliente',
          avatar: (h.clients as any)?.avatar || null,
          daysSinceContact,
          lastContactAt: h.last_cs_contact_at,
        };
      })
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
      .slice(0, 10);

    // Calculate pending NPS (clients without NPS in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pendingNPSList = healthConfigs
      .filter(h => {
        if (!h.nps_collected_at) return true;
        const lastNPS = new Date(h.nps_collected_at);
        return lastNPS < thirtyDaysAgo;
      })
      .map(h => {
        const lastNPS = h.nps_collected_at ? new Date(h.nps_collected_at) : null;
        const daysSinceNPS = lastNPS
          ? Math.floor((Date.now() - lastNPS.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        return {
          id: h.client_id,
          name: (h.clients as any)?.name || 'Cliente',
          avatar: (h.clients as any)?.avatar || null,
          daysSinceNPS,
          lastNPSAt: h.nps_collected_at,
        };
      })
      .sort((a, b) => b.daysSinceNPS - a.daysSinceNPS)
      .slice(0, 10);

    const responseData: CSTVDashboardData = {
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
      },
      criticalClients: criticalClientsList,
      criticalConversations: criticalConversationsList,
      pendingContacts: pendingContactsList,
      pendingNPS: pendingNPSList,
    };

    console.log('CS TV Dashboard data prepared successfully');

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cs-tv-dashboard-data:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
