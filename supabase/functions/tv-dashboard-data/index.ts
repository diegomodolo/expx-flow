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

    // Fetch campaigns, clients with budget/balance data in parallel
    const [campaignsResult, clientsResult, clientsWithBudgetResult] = await Promise.all([
      // Campaigns with client info
      supabase
        .from('campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at,
          clients!inner(id, name, company)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true),
      
      // Clients on alert - red or yellow status (calculated_status has priority)
      supabase
        .from('clients')
        .select('id, name, company, calculated_status, status, avatar, leads_generated, avg_cpl, status_explanation')
        .eq('company_id', company.id)
        .in('calculated_status', ['red', 'yellow']),
      
      // All clients with budget and balance info
      supabase
        .from('clients')
        .select(`
          id, name, avatar, monthly_budget, last_sync_period,
          facebook_ad_accounts(balance, recharge_day)
        `)
        .eq('company_id', company.id)
    ]);

    const campaigns = campaignsResult.data || [];
    const clientsOnAlert = clientsResult.data || [];
    const clientsWithBudget = clientsWithBudgetResult.data || [];

    // Build client ID to name map
    const clientNameMap: Record<string, string> = {};
    const clientAvatarMap: Record<string, string> = {};
    clientsWithBudget.forEach(c => {
      clientNameMap[c.id] = c.name;
      if (c.avatar) clientAvatarMap[c.id] = c.avatar;
    });

    // Calculate spend per client from campaigns
    const clientSpend: Record<string, number> = {};
    campaigns.forEach(c => {
      if (c.client_id) {
        clientSpend[c.client_id] = (clientSpend[c.client_id] || 0) + (c.spend || 0);
      }
    });

    console.log(`[tv-dashboard-data] Found ${campaigns.length} campaigns, ${clientsOnAlert.length} clients on alert`);

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

    // Calculate additional metrics
    const activeCampaigns = campaigns.length;
    const activeClients = new Set(campaigns.map(c => c.client_id)).size;
    const avgCPC = totalClicks > 0 ? totalInvestment / totalClicks : 0;

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

    // Calculate worst performing campaigns
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

    // === NEW: Calculate budget/balance alerts ===
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const budgetAlerts: Array<{
      id: string;
      name: string;
      avatar: string | null;
      alertType: 'insufficient_balance' | 'over_budget';
      balance: number;
      spend: number;
      budget: number;
      daysRemaining: number;
      projectedSpend: number;
      percentage: number;
      message: string;
    }> = [];

    clientsWithBudget.forEach(client => {
      const spend = clientSpend[client.id] || 0;
      const syncPeriod = parseInt(client.last_sync_period || '0') || 7; // Default to 7 days
      const monthlyBudget = client.monthly_budget || 0;
      const fbAccount = Array.isArray(client.facebook_ad_accounts) 
        ? client.facebook_ad_accounts[0] 
        : client.facebook_ad_accounts;
      const balance = fbAccount?.balance || 0;
      const rechargeDay = fbAccount?.recharge_day;
      
      // Calculate daily spend
      const dailySpend = syncPeriod > 0 ? spend / syncPeriod : 0;
      
      // Check 1: Budget overspend
      if (monthlyBudget > 0 && syncPeriod > 0) {
        const expectedSpend = (monthlyBudget / 30) * syncPeriod;
        const percentage = (spend / expectedSpend) * 100;
        
        if (percentage > 100) {
          budgetAlerts.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            alertType: 'over_budget',
            balance,
            spend,
            budget: monthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`
          });
        }
      }
      
      // Check 2: Insufficient balance until recharge day
      if (balance > 0 && dailySpend > 0) {
        let nextRechargeDate: Date;
        
        if (rechargeDay && rechargeDay >= 1 && rechargeDay <= 31) {
          if (currentDay < rechargeDay) {
            nextRechargeDate = new Date(currentYear, currentMonth, rechargeDay);
          } else {
            nextRechargeDate = new Date(currentYear, currentMonth + 1, rechargeDay);
          }
          
          // Adjust for months with fewer days
          const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
          if (rechargeDay > maxDayInMonth) {
            nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
          }
        } else {
          // Fallback: end of month
          nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
        }
        
        const timeDiff = nextRechargeDate.getTime() - now.getTime();
        const daysRemaining = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
        const projectedSpend = dailySpend * daysRemaining;
        const coveragePercentage = (balance / projectedSpend) * 100;
        
        // If balance won't last (< 80% coverage)
        if (coveragePercentage < 80) {
          // Avoid duplicates if already has budget alert
          const hasOverBudget = budgetAlerts.some(a => a.id === client.id && a.alertType === 'over_budget');
          if (!hasOverBudget) {
            budgetAlerts.push({
              id: client.id,
              name: client.name,
              avatar: client.avatar,
              alertType: 'insufficient_balance',
              balance,
              spend,
              budget: monthlyBudget,
              daysRemaining,
              projectedSpend,
              percentage: coveragePercentage,
              message: `Saldo R$ ${balance.toFixed(0)} não dura ${daysRemaining} dias`
            });
          }
        }
      }
    });

    // Sort budget alerts by severity (lower percentage = more critical)
    budgetAlerts.sort((a, b) => a.percentage - b.percentage);

    console.log(`[tv-dashboard-data] Found ${budgetAlerts.length} budget alerts`);

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
        investmentChange: 0,
        leadsChange: 0,
        cpaChange: 0,
        ctrChange: 0
      },
      alerts: alerts.slice(0, 10),
      campaigns: campaignRanking,
      clientsOnAlert: formattedClientsOnAlert,
      topClients,
      worstCampaigns,
      budgetAlerts: budgetAlerts.slice(0, 10)
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
