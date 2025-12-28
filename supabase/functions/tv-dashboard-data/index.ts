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

    // Fetch campaigns, clients, and tasks in parallel
    const [campaignsResult, clientsResult, tasksResult, allClientsResult] = await Promise.all([
      // Campaigns with client info
      supabase
        .from('campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at,
          clients!inner(id, name, company)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true),
      
      // Clients on alert - using actual status values (red, yellow, green OR atencao, emergencial)
      supabase
        .from('clients')
        .select('id, name, company, calculated_status, status, avatar, leads_generated, avg_cpl, status_explanation')
        .eq('company_id', company.id)
        .or('calculated_status.in.(atencao,emergencial,red,yellow),status.in.(atencao,emergencial,red,yellow)'),
      
      // Tasks
      supabase
        .from('tasks')
        .select('id, title, priority, status, deadline, responsible_name, client_id')
        .eq('company_id', company.id)
        .in('status', ['todo', 'in_progress'])
        .order('deadline', { ascending: true })
        .limit(10),
      
      // All clients for building client name map
      supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', company.id)
    ]);

    const campaigns = campaignsResult.data || [];
    const clientsOnAlert = clientsResult.data || [];
    const tasks = tasksResult.data || [];
    const allClients = allClientsResult.data || [];

    // Build client ID to name map
    const clientNameMap: Record<string, string> = {};
    allClients.forEach(c => {
      clientNameMap[c.id] = c.name;
    });

    console.log(`[tv-dashboard-data] Found ${campaigns.length} campaigns, ${clientsOnAlert.length} clients on alert, ${tasks.length} tasks`);

    // Calculate metrics
    const totalInvestment = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    
    const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Generate alerts with client names
    const alerts: Array<{ 
      id: string; 
      type: string; 
      severity: string; 
      title: string; 
      description: string; 
      campaignId?: string;
      clientName?: string;
      campaignName?: string;
      value?: string;
    }> = [];

    campaigns.forEach(campaign => {
      const clientName = (campaign.clients as any)?.name || clientNameMap[campaign.client_id] || 'Cliente';
      
      if (campaign.cpa && campaign.cpa > 50) {
        alerts.push({
          id: `cpa-${campaign.id}`,
          type: 'high_cpa',
          severity: 'critical',
          title: 'CPA Alto',
          description: `CPA de R$ ${campaign.cpa.toFixed(2)} está acima do limite`,
          campaignId: campaign.id,
          clientName: clientName,
          campaignName: campaign.name,
          value: `R$ ${campaign.cpa.toFixed(2)}`
        });
      }
      if (campaign.ctr && campaign.ctr < 1) {
        alerts.push({
          id: `ctr-${campaign.id}`,
          type: 'low_ctr',
          severity: 'warning',
          title: 'CTR Baixo',
          description: `CTR de ${campaign.ctr.toFixed(2)}% está abaixo do ideal`,
          campaignId: campaign.id,
          clientName: clientName,
          campaignName: campaign.name,
          value: `${campaign.ctr.toFixed(2)}%`
        });
      }
    });

    // Sort campaigns by CPA for ranking, include client name
    const campaignRanking = campaigns
      .filter(c => c.conversions && c.conversions > 0)
      .sort((a, b) => (a.cpa || 999) - (b.cpa || 999))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        clientName: (c.clients as any)?.name || clientNameMap[c.client_id] || 'Cliente',
        clientId: c.client_id,
        spend: c.spend || 0,
        leads: c.conversions || 0,
        cpa: c.cpa || 0,
        ctr: c.ctr || 0,
        status: c.status
      }));

    // Format tasks with client names
    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority || 'medium',
      status: t.status,
      dueDate: t.deadline,
      responsible: t.responsible_name,
      clientName: t.client_id ? clientNameMap[t.client_id] : null
    }));

    // Format clients on alert with proper status mapping
    const formattedClientsOnAlert = clientsOnAlert.map(c => {
      // Map red/yellow to atencao/emergencial for frontend
      let displayStatus = c.calculated_status || c.status;
      if (displayStatus === 'red') displayStatus = 'emergencia';
      if (displayStatus === 'yellow') displayStatus = 'atencao';
      
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        status: displayStatus,
        statusExplanation: c.status_explanation,
        avatar: c.avatar,
        leads: c.leads_generated || 0,
        avgCpl: c.avg_cpl || 0
      };
    });

    // Count active campaigns per client
    const campaignsPerClient: Record<string, number> = {};
    campaigns.forEach(c => {
      if (c.client_id) {
        campaignsPerClient[c.client_id] = (campaignsPerClient[c.client_id] || 0) + 1;
      }
    });

    // Calculate additional metrics for the third row
    const activeCampaigns = campaigns.length;
    const activeClients = new Set(campaigns.map(c => c.client_id)).size;
    const avgCPC = totalClicks > 0 ? totalInvestment / totalClicks : 0;
    const totalReach = campaigns.reduce((sum, c) => sum + ((c as any).reach || 0), 0);

    // Get top performing clients
    const clientPerformance = campaigns.reduce((acc, c) => {
      const clientId = c.client_id;
      if (!acc[clientId]) {
        acc[clientId] = {
          id: clientId,
          name: (c.clients as any)?.name || clientNameMap[clientId] || 'Cliente',
          spend: 0,
          conversions: 0,
          campaigns: 0
        };
      }
      acc[clientId].spend += c.spend || 0;
      acc[clientId].conversions += c.conversions || 0;
      acc[clientId].campaigns += 1;
      return acc;
    }, {} as Record<string, any>);

    const topClients = Object.values(clientPerformance)
      .filter((c: any) => c.conversions > 0)
      .map((c: any) => ({
        ...c,
        cpa: c.spend / c.conversions
      }))
      .sort((a: any, b: any) => a.cpa - b.cpa)
      .slice(0, 5);

    // Calculate worst performing campaigns (for alerts)
    const worstCampaigns = campaigns
      .filter(c => c.conversions && c.conversions > 0 && c.cpa && c.cpa > 50)
      .sort((a, b) => (b.cpa || 0) - (a.cpa || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        clientName: (c.clients as any)?.name || clientNameMap[c.client_id] || 'Cliente',
        cpa: c.cpa || 0,
        spend: c.spend || 0,
        conversions: c.conversions || 0
      }));

    const response = {
      company: {
        id: company.id,
        name: company.name
      },
      lastSync: new Date().toISOString(),
      metrics: {
        totalInvestment,
        totalLeads,
        averageCPA,
        averageCTR,
        activeCampaigns,
        activeClients,
        avgCPC,
        totalReach,
        investmentChange: 0,
        leadsChange: 0,
        cpaChange: 0,
        ctrChange: 0
      },
      alerts: alerts.slice(0, 10),
      campaigns: campaignRanking,
      tasks: formattedTasks,
      clientsOnAlert: formattedClientsOnAlert,
      topClients,
      worstCampaigns
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
