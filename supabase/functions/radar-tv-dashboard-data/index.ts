// Radar TV Dashboard Data Edge Function - Public access for TV display
// Shows opportunities and risks across all clients
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ClientRisk {
  id: string;
  name: string;
  avatar: string | null;
  riskType: 'performance' | 'budget' | 'balance' | 'inactive';
  severity: 'critical' | 'warning';
  message: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

interface ClientOpportunity {
  id: string;
  name: string;
  avatar: string | null;
  opportunityType: 'scale' | 'optimization' | 'expansion';
  message: string;
  potentialGain: string;
  currentValue: string;
}

interface RadarMetrics {
  totalClients: number;
  clientsAtRisk: number;
  clientsWithOpportunities: number;
  criticalAlerts: number;
  warningAlerts: number;
  totalBudget: number;
  totalSpend: number;
  budgetUtilization: number;
  avgCPA: number;
  totalConversions: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Accept token via query (GET) or JSON body (POST/invoke)
    let token: string | null = url.searchParams.get('token');

    if (!token) {
      try {
        const body = await req.json().catch(() => null);
        token = body?.token ?? null;
      } catch {
        // ignore
      }
    }

    if (!token) {
      console.error('[radar-tv] No token provided');
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[radar-tv] Fetching data for token: ${token.substring(0, 4)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find company by radar token
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('radar_tv_dashboard_token', token)
      .single();

    if (companyError || !company) {
      console.error('[radar-tv] Company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou empresa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[radar-tv] Company found: ${company.name}`);

    // Fetch all necessary data in parallel
    const [
      clientsResult,
      metaCampaignsResult,
      googleCampaignsResult,
      syncInfoResult,
    ] = await Promise.all([
      // All active clients
      supabase
        .from('clients')
        .select(`
          id, name, avatar, status, calculated_status, status_explanation,
          monthly_budget, meta_monthly_budget, google_monthly_budget,
          leads_generated, avg_cpl,
          ad_account_id, google_account_id,
          facebook_ad_accounts(balance, account_status)
        `)
        .eq('company_id', company.id)
        .eq('is_canceled', false),

      // Meta campaigns
      supabase
        .from('campaigns')
        .select('id, name, client_id, spend, conversions, cpa, ctr, status, is_active')
        .eq('company_id', company.id),

      // Google campaigns
      supabase
        .from('google_campaigns')
        .select('id, name, client_id, spend, conversions, cpa, ctr, status, is_active')
        .eq('company_id', company.id),

      // Sync info
      supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', company.id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1),
    ]);

    const clients = clientsResult.data || [];
    const metaCampaigns = metaCampaignsResult.data || [];
    const googleCampaigns = googleCampaignsResult.data || [];
    const syncInfo = syncInfoResult.data?.[0] || null;

    console.log(`[radar-tv] Found ${clients.length} clients, ${metaCampaigns.length} meta campaigns, ${googleCampaigns.length} google campaigns`);

    // Build client spend map
    const clientSpend: Record<string, { meta: number; google: number; total: number; conversions: number }> = {};
    
    metaCampaigns.forEach(c => {
      if (c.client_id) {
        if (!clientSpend[c.client_id]) {
          clientSpend[c.client_id] = { meta: 0, google: 0, total: 0, conversions: 0 };
        }
        clientSpend[c.client_id].meta += (c.spend || 0);
        clientSpend[c.client_id].total += (c.spend || 0);
        clientSpend[c.client_id].conversions += (c.conversions || 0);
      }
    });

    googleCampaigns.forEach(c => {
      if (c.client_id) {
        if (!clientSpend[c.client_id]) {
          clientSpend[c.client_id] = { meta: 0, google: 0, total: 0, conversions: 0 };
        }
        clientSpend[c.client_id].google += (c.spend || 0);
        clientSpend[c.client_id].total += (c.spend || 0);
        clientSpend[c.client_id].conversions += (c.conversions || 0);
      }
    });

    // Calculate risks and opportunities
    const risks: ClientRisk[] = [];
    const opportunities: ClientOpportunity[] = [];

    clients.forEach(client => {
      const spend = clientSpend[client.id] || { meta: 0, google: 0, total: 0, conversions: 0 };
      const budget = (client.meta_monthly_budget || 0) + (client.google_monthly_budget || 0) || client.monthly_budget || 0;
      const budgetUtilization = budget > 0 ? (spend.total / budget) * 100 : 0;
      const cpa = spend.conversions > 0 ? spend.total / spend.conversions : 0;
      const avgCpl = client.avg_cpl || 0;

      // Check for risks based on calculated_status
      // 1. Performance risk (red status)
      if (client.calculated_status === 'red') {
        risks.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          riskType: 'performance',
          severity: 'critical',
          message: client.status_explanation?.split('\n')[0] || 'Performance crítica detectada',
          value: cpa > 0 ? `CPA: R$ ${cpa.toFixed(2)}` : 'Sem conversões',
          trend: 'down'
        });
      } else if (client.calculated_status === 'yellow') {
        // 2. Yellow status - warning
        risks.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          riskType: 'performance',
          severity: 'warning',
          message: client.status_explanation?.split('\n')[0] || 'Performance abaixo do esperado',
          value: cpa > 0 ? `CPA: R$ ${cpa.toFixed(2)}` : 'Baixas conversões',
          trend: 'down'
        });
      }

      // 3. Budget risk (over budget)
      if (budgetUtilization > 100) {
        risks.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          riskType: 'budget',
          severity: budgetUtilization > 120 ? 'critical' : 'warning',
          message: `Orçamento excedido em ${(budgetUtilization - 100).toFixed(0)}%`,
          value: `R$ ${spend.total.toFixed(2)} / R$ ${budget.toFixed(2)}`,
          trend: 'up'
        });
      }

      // 4. Balance risk (Meta ad account low balance)
      const fbAccount = Array.isArray(client.facebook_ad_accounts) 
        ? client.facebook_ad_accounts[0] 
        : client.facebook_ad_accounts;
      
      if (fbAccount && typeof fbAccount.balance === 'number') {
        const balance = fbAccount.balance;
        const dailySpend = spend.meta / 30;
        const daysRemaining = dailySpend > 0 ? balance / dailySpend : 999;
        
        if (daysRemaining < 3 && balance < 500) {
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'balance',
            severity: daysRemaining < 1 ? 'critical' : 'warning',
            message: `Saldo para ${daysRemaining.toFixed(1)} dias`,
            value: `R$ ${balance.toFixed(2)}`,
            trend: 'down'
          });
        }
      }

      // Check for opportunities
      // 1. Green status with good performance - scale opportunity
      if (client.calculated_status === 'green' && spend.conversions > 5 && budgetUtilization < 80) {
        const potentialIncrease = Math.min((budget - spend.total), budget * 0.3);
        opportunities.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          opportunityType: 'scale',
          message: 'Cliente com boa performance - potencial para escalar',
          potentialGain: `+R$ ${potentialIncrease.toFixed(0)} em budget`,
          currentValue: cpa > 0 ? `CPA: R$ ${cpa.toFixed(2)}` : `${spend.conversions} conversões`
        });
      }

      // 2. Low budget utilization opportunity
      if (budgetUtilization > 0 && budgetUtilization < 50 && client.calculated_status !== 'red') {
        opportunities.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          opportunityType: 'expansion',
          message: `Apenas ${budgetUtilization.toFixed(0)}% do orçamento utilizado`,
          potentialGain: `+R$ ${(budget * 0.5 - spend.total).toFixed(0)} disponível`,
          currentValue: `Utilização: ${budgetUtilization.toFixed(0)}%`
        });
      }

      // 3. Optimization opportunity - high spend but could improve
      if (spend.total > 3000 && avgCpl > 0 && cpa > avgCpl * 1.2 && client.calculated_status !== 'green') {
        const potentialSavings = spend.total * 0.15;
        opportunities.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          opportunityType: 'optimization',
          message: 'Potencial de otimização identificado',
          potentialGain: `Economia de R$ ${potentialSavings.toFixed(0)}`,
          currentValue: `CPA: R$ ${cpa.toFixed(2)} (média: R$ ${avgCpl.toFixed(2)})`
        });
      }
    });

    // Calculate overall metrics
    const totalBudget = clients.reduce((sum, c) => {
      return sum + ((c.meta_monthly_budget || 0) + (c.google_monthly_budget || 0) || c.monthly_budget || 0);
    }, 0);

    const totalSpend = Object.values(clientSpend).reduce((sum, s) => sum + s.total, 0);
    const totalConversions = Object.values(clientSpend).reduce((sum, s) => sum + s.conversions, 0);

    // Count unique clients at risk (not counting same client twice for different risk types)
    const uniqueRiskClientIds = new Set(risks.map(r => r.id));
    const uniqueOpportunityClientIds = new Set(opportunities.map(o => o.id));

    const metrics: RadarMetrics = {
      totalClients: clients.length,
      clientsAtRisk: uniqueRiskClientIds.size,
      clientsWithOpportunities: uniqueOpportunityClientIds.size,
      criticalAlerts: risks.filter(r => r.severity === 'critical').length,
      warningAlerts: risks.filter(r => r.severity === 'warning').length,
      totalBudget,
      totalSpend,
      budgetUtilization: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
      avgCPA: totalConversions > 0 ? totalSpend / totalConversions : 0,
      totalConversions
    };

    // Sort risks by severity and opportunities by potential
    const sortedRisks = risks
      .sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return 0;
      })
      .slice(0, 12);

    const sortedOpportunities = opportunities.slice(0, 8);

    // Risk distribution by type
    const riskDistribution = {
      performance: risks.filter(r => r.riskType === 'performance').length,
      budget: risks.filter(r => r.riskType === 'budget').length,
      balance: risks.filter(r => r.riskType === 'balance').length,
      inactive: risks.filter(r => r.riskType === 'inactive').length
    };

    console.log(`[radar-tv] Returning ${sortedRisks.length} risks, ${sortedOpportunities.length} opportunities, ${metrics.totalClients} clients`);

    return new Response(
      JSON.stringify({
        companyName: company.name,
        lastSyncAt: syncInfo?.last_sync_at || null,
        syncPeriod: syncInfo?.last_sync_period || null,
        metrics,
        risks: sortedRisks,
        opportunities: sortedOpportunities,
        riskDistribution
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[radar-tv] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
