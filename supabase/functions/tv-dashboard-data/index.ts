// TV Dashboard Data Edge Function - Public access
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.error('No token provided');
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[tv-dashboard-data] Fetching data for token: ${token.substring(0, 4)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find company by token
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('tv_dashboard_token', token)
      .single();

    if (companyError || !company) {
      console.error('Company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou empresa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[tv-dashboard-data] Company found: ${company.name}`);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Fetch campaigns, clients, and tasks in parallel
    const [campaignsResult, clientsResult, tasksResult] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at')
        .eq('company_id', company.id)
        .eq('is_active', true),
      
      supabase
        .from('clients')
        .select('id, name, company, calculated_status, status, avatar, leads_generated')
        .eq('company_id', company.id)
        .in('calculated_status', ['atencao', 'emergencial']),
      
      supabase
        .from('tasks')
        .select('id, title, priority, status, deadline, responsible_name')
        .eq('company_id', company.id)
        .in('status', ['todo', 'in_progress'])
        .order('deadline', { ascending: true })
        .limit(10)
    ]);

    const campaigns = campaignsResult.data || [];
    const clients = clientsResult.data || [];
    const tasks = tasksResult.data || [];

    console.log(`[tv-dashboard-data] Found ${campaigns.length} campaigns, ${clients.length} clients on alert, ${tasks.length} tasks`);

    // Calculate metrics
    const totalInvestment = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    
    const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Generate alerts
    const alerts: Array<{ id: string; type: string; severity: string; title: string; description: string; campaignId?: string }> = [];

    campaigns.forEach(campaign => {
      if (campaign.cpa && campaign.cpa > 50) {
        alerts.push({
          id: `cpa-${campaign.id}`,
          type: 'high_cpa',
          severity: 'critical',
          title: `CPA Alto: ${campaign.name}`,
          description: `CPA de R$ ${campaign.cpa.toFixed(2)} está acima do limite`,
          campaignId: campaign.id
        });
      }
      if (campaign.ctr && campaign.ctr < 1) {
        alerts.push({
          id: `ctr-${campaign.id}`,
          type: 'low_ctr',
          severity: 'warning',
          title: `CTR Baixo: ${campaign.name}`,
          description: `CTR de ${campaign.ctr.toFixed(2)}% está abaixo do ideal`,
          campaignId: campaign.id
        });
      }
    });

    // Sort campaigns by CPA for ranking
    const campaignRanking = campaigns
      .filter(c => c.conversions && c.conversions > 0)
      .sort((a, b) => (a.cpa || 999) - (b.cpa || 999))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        spend: c.spend || 0,
        leads: c.conversions || 0,
        cpa: c.cpa || 0,
        ctr: c.ctr || 0,
        status: c.status
      }));

    // Format tasks
    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority || 'medium',
      status: t.status,
      dueDate: t.deadline,
      responsible: t.responsible_name
    }));

    // Format clients on alert
    const clientsOnAlert = clients.map(c => ({
      id: c.id,
      name: c.name,
      company: c.company,
      status: c.calculated_status || c.status,
      avatar: c.avatar,
      leads: c.leads_generated || 0
    }));

    const response = {
      company: {
        id: company.id,
        name: company.name
      },
      lastSync: now.toISOString(),
      metrics: {
        totalInvestment,
        totalLeads,
        averageCPA,
        averageCTR,
        investmentChange: 0, // Would need historical data
        leadsChange: 0,
        cpaChange: 0,
        ctrChange: 0
      },
      alerts: alerts.slice(0, 10),
      campaigns: campaignRanking,
      tasks: formattedTasks,
      clientsOnAlert
    };

    console.log(`[tv-dashboard-data] Response prepared successfully`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[tv-dashboard-data] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
