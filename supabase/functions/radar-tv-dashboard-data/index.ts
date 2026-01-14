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

interface ClientBenchmark {
  client_id: string;
  platform: string;
  target_cpa: number | null;
  target_cpl: number | null;
  target_ctr: number | null;
  target_cpc: number | null;
  target_cpm: number | null;
  target_roas: number | null;
  target_frequency: number | null;
  is_active: boolean;
}

// System fallback defaults (used when company has no configuration)
const SYSTEM_FALLBACK_BENCHMARKS = {
  target_cpa: 100,
  target_cpl: 50,
  target_ctr: 1,
  target_cpc: 3,
  target_cpm: 30,
  target_roas: 3,
  target_frequency: 3,
};

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
      benchmarksResult,
      companySettingsResult,
    ] = await Promise.all([
      // All active clients (excluding canceled AND paused)
      supabase
        .from('clients')
        .select(`
          id, name, avatar, status, calculated_status, status_explanation,
          monthly_budget, meta_monthly_budget, google_monthly_budget,
          leads_generated, avg_cpl, is_paused,
          ad_account_id, google_account_id,
          facebook_ad_accounts(balance, account_status, can_advertise, is_restricted)
        `)
        .eq('company_id', company.id)
        .eq('is_canceled', false),

      // Meta campaigns
      supabase
        .from('campaigns')
        .select('id, name, client_id, spend, conversions, cpa, ctr, cpc, cpm, frequency, status, is_active')
        .eq('company_id', company.id),

      // Google campaigns
      supabase
        .from('google_campaigns')
        .select('id, name, client_id, spend, conversions, cpa, ctr, cpc, status, is_active')
        .eq('company_id', company.id),

      // Sync info
      supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', company.id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1),

      // Client benchmarks
      supabase
        .from('client_metric_benchmarks')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true),

      // Company settings for default benchmarks
      supabase
        .from('company_settings')
        .select('default_target_cpa, default_target_cpl, default_target_ctr, default_target_cpc, default_target_cpm, default_target_roas, default_target_frequency')
        .eq('company_id', company.id)
        .maybeSingle(),
    ]);

    const allClients = clientsResult.data || [];
    const metaCampaigns = metaCampaignsResult.data || [];
    const googleCampaigns = googleCampaignsResult.data || [];
    const syncInfo = syncInfoResult.data?.[0] || null;
    const benchmarks = (benchmarksResult.data || []) as ClientBenchmark[];
    const companySettings = companySettingsResult.data;

    // Build company default benchmarks (from settings or fallback to system defaults)
    const DEFAULT_BENCHMARKS = {
      target_cpa: companySettings?.default_target_cpa ?? SYSTEM_FALLBACK_BENCHMARKS.target_cpa,
      target_cpl: companySettings?.default_target_cpl ?? SYSTEM_FALLBACK_BENCHMARKS.target_cpl,
      target_ctr: companySettings?.default_target_ctr ?? SYSTEM_FALLBACK_BENCHMARKS.target_ctr,
      target_cpc: companySettings?.default_target_cpc ?? SYSTEM_FALLBACK_BENCHMARKS.target_cpc,
      target_cpm: companySettings?.default_target_cpm ?? SYSTEM_FALLBACK_BENCHMARKS.target_cpm,
      target_roas: companySettings?.default_target_roas ?? SYSTEM_FALLBACK_BENCHMARKS.target_roas,
      target_frequency: companySettings?.default_target_frequency ?? SYSTEM_FALLBACK_BENCHMARKS.target_frequency,
    };

    console.log(`[radar-tv] Using default benchmarks: CPA=${DEFAULT_BENCHMARKS.target_cpa}, CTR=${DEFAULT_BENCHMARKS.target_ctr}`);

    // Build benchmarks map by client_id and platform
    const clientBenchmarks: Record<string, { meta?: ClientBenchmark; google?: ClientBenchmark }> = {};
    benchmarks.forEach(b => {
      if (!clientBenchmarks[b.client_id]) {
        clientBenchmarks[b.client_id] = {};
      }
      if (b.platform === 'meta_ads') {
        clientBenchmarks[b.client_id].meta = b;
      } else if (b.platform === 'google_ads') {
        clientBenchmarks[b.client_id].google = b;
      }
    });

    // Separate paused clients - they should not appear in risks/opportunities
    const clients = allClients.filter(c => !c.is_paused);
    const pausedClients = allClients.filter(c => c.is_paused);

    console.log(`[radar-tv] Found ${allClients.length} total clients (${clients.length} active, ${pausedClients.length} paused), ${metaCampaigns.length} meta campaigns, ${googleCampaigns.length} google campaigns, ${benchmarks.length} benchmarks`);

    // Identify restricted accounts (from active clients only)
    interface RestrictedAccount {
      id: string;
      name: string;
      avatar: string | null;
      accountStatus: number;
      reason: string;
    }
    
    const restrictedAccounts: RestrictedAccount[] = [];
    
    clients.forEach(client => {
      const fbAccount = Array.isArray(client.facebook_ad_accounts) 
        ? client.facebook_ad_accounts[0] 
        : client.facebook_ad_accounts;
      
      if (fbAccount) {
        const isRestricted = fbAccount.is_restricted === true || 
                            fbAccount.can_advertise === false ||
                            (fbAccount.account_status && fbAccount.account_status !== 1);
        
        if (isRestricted) {
          let reason = 'Conta com restrição';
          const status = fbAccount.account_status;
          if (status === 2) reason = 'Conta desabilitada';
          else if (status === 3) reason = 'Pagamento pendente';
          else if (status === 7) reason = 'Conta pendente de revisão';
          else if (status === 9) reason = 'Conta em análise';
          else if (status === 101) reason = 'Conta fechada';
          else if (fbAccount.is_restricted) reason = 'Conta restrita';
          else if (fbAccount.can_advertise === false) reason = 'Não pode anunciar';
          
          restrictedAccounts.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            accountStatus: status || 0,
            reason
          });
        }
      }
    });

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

    // Helper function to get benchmark value with fallback to default
    const getBenchmark = (
      clientId: string, 
      platform: 'meta' | 'google', 
      metric: keyof typeof DEFAULT_BENCHMARKS
    ): { value: number; isCustom: boolean } => {
      const clientBenchmark = clientBenchmarks[clientId];
      const platformBenchmark = platform === 'meta' ? clientBenchmark?.meta : clientBenchmark?.google;
      
      if (platformBenchmark) {
        const customValue = platformBenchmark[`target_${metric.replace('target_', '')}` as keyof ClientBenchmark] as number | null;
        if (customValue !== null && customValue > 0) {
          return { value: customValue, isCustom: true };
        }
      }
      
      return { value: DEFAULT_BENCHMARKS[metric], isCustom: false };
    };

    clients.forEach(client => {
      const spend = clientSpend[client.id] || { meta: 0, google: 0, total: 0, conversions: 0 };
      const budget = (client.meta_monthly_budget || 0) + (client.google_monthly_budget || 0) || client.monthly_budget || 0;
      const budgetUtilization = budget > 0 ? (spend.total / budget) * 100 : 0;
      const totalCpa = spend.conversions > 0 ? spend.total / spend.conversions : 0;

      // Get client's campaigns for detailed metrics
      const clientMetaCampaigns = metaCampaigns.filter(c => c.client_id === client.id);
      const clientGoogleCampaigns = googleCampaigns.filter(c => c.client_id === client.id);

      // Calculate Meta Ads metrics
      const metaConversions = clientMetaCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      const metaCpa = metaConversions > 0 ? spend.meta / metaConversions : 0;
      const metaCtr = clientMetaCampaigns.length > 0 
        ? clientMetaCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / clientMetaCampaigns.length 
        : 0;
      const metaCpc = clientMetaCampaigns.length > 0
        ? clientMetaCampaigns.reduce((sum, c) => sum + (c.cpc || 0), 0) / clientMetaCampaigns.length
        : 0;
      const metaFrequency = clientMetaCampaigns.length > 0
        ? clientMetaCampaigns.reduce((sum, c) => sum + (c.frequency || 0), 0) / clientMetaCampaigns.length
        : 0;

      // Calculate Google Ads metrics
      const googleConversions = clientGoogleCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      const googleCpa = googleConversions > 0 ? spend.google / googleConversions : 0;
      const googleCtr = clientGoogleCampaigns.length > 0
        ? clientGoogleCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / clientGoogleCampaigns.length
        : 0;
      const googleCpc = clientGoogleCampaigns.length > 0
        ? clientGoogleCampaigns.reduce((sum, c) => sum + (c.cpc || 0), 0) / clientGoogleCampaigns.length
        : 0;

      // ========== META ADS RISKS ==========
      if (spend.meta > 0) {
        // CPA risk (Meta)
        const cpaBenchmark = getBenchmark(client.id, 'meta', 'target_cpa');
        if (metaCpa > 0 && metaCpa > cpaBenchmark.value) {
          const severity = metaCpa > cpaBenchmark.value * 1.5 ? 'critical' : 'warning';
          const benchmarkLabel = cpaBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CPA Meta acima do ${benchmarkLabel} (${benchmarkLabel}: R$ ${cpaBenchmark.value.toFixed(0)})`,
            value: `CPA: R$ ${metaCpa.toFixed(2)}`,
            trend: 'up'
          });
        }

        // CTR risk (Meta) - lower is worse
        const ctrBenchmark = getBenchmark(client.id, 'meta', 'target_ctr');
        if (metaCtr > 0 && metaCtr < ctrBenchmark.value) {
          const severity = metaCtr < ctrBenchmark.value * 0.5 ? 'critical' : 'warning';
          const benchmarkLabel = ctrBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CTR Meta abaixo do ${benchmarkLabel} (${benchmarkLabel}: ${ctrBenchmark.value}%)`,
            value: `CTR: ${metaCtr.toFixed(2)}%`,
            trend: 'down'
          });
        }

        // CPC risk (Meta)
        const cpcBenchmark = getBenchmark(client.id, 'meta', 'target_cpc');
        if (metaCpc > 0 && metaCpc > cpcBenchmark.value) {
          const severity = metaCpc > cpcBenchmark.value * 1.5 ? 'critical' : 'warning';
          const benchmarkLabel = cpcBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CPC Meta acima do ${benchmarkLabel} (${benchmarkLabel}: R$ ${cpcBenchmark.value.toFixed(2)})`,
            value: `CPC: R$ ${metaCpc.toFixed(2)}`,
            trend: 'up'
          });
        }

        // Frequency risk (Meta) - too high is bad
        const frequencyBenchmark = getBenchmark(client.id, 'meta', 'target_frequency');
        if (metaFrequency > 0 && metaFrequency > frequencyBenchmark.value) {
          const severity = metaFrequency > frequencyBenchmark.value * 1.5 ? 'critical' : 'warning';
          const benchmarkLabel = frequencyBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `Frequência Meta alta (${benchmarkLabel}: ${frequencyBenchmark.value}x)`,
            value: `Freq: ${metaFrequency.toFixed(1)}x`,
            trend: 'up'
          });
        }
      }

      // ========== GOOGLE ADS RISKS ==========
      if (spend.google > 0) {
        // CPA risk (Google)
        const cpaBenchmark = getBenchmark(client.id, 'google', 'target_cpa');
        if (googleCpa > 0 && googleCpa > cpaBenchmark.value) {
          const severity = googleCpa > cpaBenchmark.value * 1.5 ? 'critical' : 'warning';
          const benchmarkLabel = cpaBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CPA Google acima do ${benchmarkLabel} (${benchmarkLabel}: R$ ${cpaBenchmark.value.toFixed(0)})`,
            value: `CPA: R$ ${googleCpa.toFixed(2)}`,
            trend: 'up'
          });
        }

        // CTR risk (Google)
        const ctrBenchmark = getBenchmark(client.id, 'google', 'target_ctr');
        if (googleCtr > 0 && googleCtr < ctrBenchmark.value) {
          const severity = googleCtr < ctrBenchmark.value * 0.5 ? 'critical' : 'warning';
          const benchmarkLabel = ctrBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CTR Google abaixo do ${benchmarkLabel} (${benchmarkLabel}: ${ctrBenchmark.value}%)`,
            value: `CTR: ${googleCtr.toFixed(2)}%`,
            trend: 'down'
          });
        }

        // CPC risk (Google)
        const cpcBenchmark = getBenchmark(client.id, 'google', 'target_cpc');
        if (googleCpc > 0 && googleCpc > cpcBenchmark.value) {
          const severity = googleCpc > cpcBenchmark.value * 1.5 ? 'critical' : 'warning';
          const benchmarkLabel = cpcBenchmark.isCustom ? 'meta' : 'padrão';
          risks.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            riskType: 'performance',
            severity,
            message: `CPC Google acima do ${benchmarkLabel} (${benchmarkLabel}: R$ ${cpcBenchmark.value.toFixed(2)})`,
            value: `CPC: R$ ${googleCpc.toFixed(2)}`,
            trend: 'up'
          });
        }
      }

      // ========== BUDGET & BALANCE RISKS ==========
      // Budget risk (over budget)
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

      // Balance risk (Meta ad account low balance)
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

      // ========== OPPORTUNITIES ==========
      // Check if client has good performance based on benchmarks
      const hasGoodMetaPerformance = spend.meta > 0 && (
        (metaCpa > 0 && metaCpa < getBenchmark(client.id, 'meta', 'target_cpa').value * 0.8) ||
        (metaCtr > 0 && metaCtr > getBenchmark(client.id, 'meta', 'target_ctr').value * 1.2)
      );
      
      const hasGoodGooglePerformance = spend.google > 0 && (
        (googleCpa > 0 && googleCpa < getBenchmark(client.id, 'google', 'target_cpa').value * 0.8) ||
        (googleCtr > 0 && googleCtr > getBenchmark(client.id, 'google', 'target_ctr').value * 1.2)
      );

      // Scale opportunity - good performance with room to grow
      if ((hasGoodMetaPerformance || hasGoodGooglePerformance) && budgetUtilization < 80) {
        const potentialIncrease = Math.min((budget - spend.total), budget * 0.3);
        opportunities.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          opportunityType: 'scale',
          message: 'Métricas abaixo das metas - potencial para escalar',
          potentialGain: `+R$ ${potentialIncrease.toFixed(0)} em budget`,
          currentValue: totalCpa > 0 ? `CPA: R$ ${totalCpa.toFixed(2)}` : `${spend.conversions} conversões`
        });
      }

      // Low budget utilization opportunity
      if (budgetUtilization > 0 && budgetUtilization < 50 && !(hasGoodMetaPerformance === false && hasGoodGooglePerformance === false)) {
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

      // Optimization opportunity - metrics above targets
      const needsOptimization = (
        (metaCpa > 0 && metaCpa > getBenchmark(client.id, 'meta', 'target_cpa').value) ||
        (googleCpa > 0 && googleCpa > getBenchmark(client.id, 'google', 'target_cpa').value)
      );
      
      if (spend.total > 3000 && needsOptimization) {
        const potentialSavings = spend.total * 0.15;
        const targetCpa = Math.min(
          getBenchmark(client.id, 'meta', 'target_cpa').value,
          getBenchmark(client.id, 'google', 'target_cpa').value
        );
        opportunities.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          opportunityType: 'optimization',
          message: 'CPA acima da meta - potencial de otimização',
          potentialGain: `Economia de R$ ${potentialSavings.toFixed(0)}`,
          currentValue: `CPA: R$ ${totalCpa.toFixed(2)} (meta: R$ ${targetCpa.toFixed(0)})`
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

    console.log(`[radar-tv] Returning ${sortedRisks.length} risks, ${sortedOpportunities.length} opportunities, ${metrics.totalClients} clients, ${restrictedAccounts.length} restricted accounts`);

    return new Response(
      JSON.stringify({
        companyName: company.name,
        lastSyncAt: syncInfo?.last_sync_at || null,
        syncPeriod: syncInfo?.last_sync_period || null,
        metrics,
        risks: sortedRisks,
        opportunities: sortedOpportunities,
        riskDistribution,
        restrictedAccounts
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
