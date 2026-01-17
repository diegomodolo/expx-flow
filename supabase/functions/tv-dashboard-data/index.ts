// TV Dashboard Data Edge Function - Public access
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Objetivos de campanha que focam em conversão/leads (devem ter alertas de CPA)
const CONVERSION_OBJECTIVES = [
  'OUTCOME_LEADS',
  'LEAD_GENERATION',
  'CONVERSIONS',
  'OUTCOME_CONVERSIONS',
  'OUTCOME_SALES',
];

interface UnifiedCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  client_id: string;
  is_active: boolean;
  updated_at: string;
  platform: 'meta' | 'google';
  frequency: number | null;
  objective?: string | null;
  clients?: { id: string; name: string; company: string };
}

interface BudgetAlert {
  id: string;
  name: string;
  avatar: string | null;
  category: 'saldo' | 'gasto';
  severity: 'critical' | 'warning';
  balance: number;
  spend: number;
  budget: number;
  daysRemaining: number;
  projectedSpend: number;
  percentage: number;
  coveragePercentage: number;
  message: string;
  platform: string;
  sortPriority: number;
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

    // Fetch Meta campaigns, Google campaigns, clients, benchmarks, company settings and sync info in parallel
    const [
      metaCampaignsResult,
      googleCampaignsResult,
      allMetaCampaignsResult,
      allGoogleCampaignsResult,
      clientsResult,
      clientsWithBudgetResult,
      allClientsResult,
      syncInfoResult,
      benchmarksResult,
      companySettingsResult,
    ] = await Promise.all([
      // Meta Campaigns with client info (ACTIVE ONLY - for KPIs/rankings)
      supabase
        .from('campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at, platforms, frequency, objective,
          clients!inner(id, name, company)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true),

      // Google Campaigns with client info (ACTIVE ONLY - for KPIs/rankings)
      supabase
        .from('google_campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at, frequency,
          clients!inner(id, name, company)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true),

      // ALL Meta Campaigns (for consolidated spend/budget alerts - matches Clientes.tsx)
      supabase
        .from('campaigns')
        .select('client_id, spend, conversions')
        .eq('company_id', company.id),

      // ALL Google Campaigns (for consolidated spend/budget alerts - matches Clientes.tsx)
      supabase
        .from('google_campaigns')
        .select('client_id, spend, conversions')
        .eq('company_id', company.id),

      // Clients on alert - red or yellow status (calculated_status has priority)
      // EXCLUDE paused clients
      supabase
        .from('clients')
        .select(`
          id, name, company, calculated_status, status, avatar, leads_generated, avg_cpl, status_explanation, is_paused,
          facebook_ad_accounts(account_status, can_advertise, is_restricted)
        `)
        .eq('company_id', company.id)
        .eq('is_canceled', false)
        .eq('is_paused', false),

      // Clients with budget/balance info (aligned to Clientes.tsx)
      // IMPORTANT: google_ads_accounts does NOT contain balance/status fields in our schema, so we don't join it here.
      supabase
        .from('clients')
        .select(`
          id, name, avatar, status, last_sync_period, is_paused,
          monthly_budget, meta_monthly_budget, google_monthly_budget,
          meta_payment_type, meta_recharge_day,
          google_payment_type, google_recharge_day,
          payment_type,
          ad_account_id, google_account_id,
          facebook_ad_accounts(balance, recharge_day, account_status, has_funding_issues, disable_reason, can_advertise, is_restricted)
        `)
        .eq('company_id', company.id)
        .eq('is_canceled', false)
        .eq('is_paused', false),

      // All clients (to find those without active campaigns) - exclude paused
      supabase
        .from('clients')
        .select('id, name, avatar, status, is_paused')
        .eq('company_id', company.id)
        .eq('is_canceled', false)
        .eq('is_paused', false),

      // Get most recent sync info
      supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', company.id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1),

      // Get client metric benchmarks
      supabase
        .from('client_metric_benchmarks')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true),

      // Get company settings for default benchmarks
      supabase
        .from('company_settings')
        .select('default_target_cpa, default_target_cpl, default_target_ctr, default_target_cpc, default_target_cpm, default_target_roas, default_target_frequency')
        .eq('company_id', company.id)
        .maybeSingle(),
    ]);

    // Log critical query errors (we still try to return partial data when possible)
    if (clientsWithBudgetResult.error) {
      console.error('[tv-dashboard-data] clientsWithBudget query error:', clientsWithBudgetResult.error);
    }

    const metaCampaigns = metaCampaignsResult.data || [];
    const googleCampaigns = googleCampaignsResult.data || [];
    const allMetaCampaigns = allMetaCampaignsResult.data || [];
    const allGoogleCampaigns = allGoogleCampaignsResult.data || [];
    const clientsOnAlert = clientsResult.data || [];
    const clientsWithBudget = clientsWithBudgetResult.data || [];
    const allClients = allClientsResult.data || [];
    const syncInfo = syncInfoResult.data?.[0] || null;
    const benchmarks = benchmarksResult.data || [];
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

    console.log(`[tv-dashboard-data] Using default benchmarks: CPA=${DEFAULT_BENCHMARKS.target_cpa}, CTR=${DEFAULT_BENCHMARKS.target_ctr}`);

    // Build client benchmarks map
    const clientBenchmarks: Record<string, { meta?: ClientBenchmark; google?: ClientBenchmark }> = {};
    benchmarks.forEach((b: ClientBenchmark) => {
      if (!clientBenchmarks[b.client_id]) {
        clientBenchmarks[b.client_id] = {};
      }
      if (b.platform === 'meta_ads') {
        clientBenchmarks[b.client_id].meta = b;
      } else if (b.platform === 'google_ads') {
        clientBenchmarks[b.client_id].google = b;
      }
    });

    // Helper function to get benchmark value with fallback to defaults
    const getBenchmark = (
      clientId: string,
      platform: 'meta' | 'google',
      metric: keyof typeof DEFAULT_BENCHMARKS
    ): { value: number; isCustom: boolean } => {
      const clientBenchmark = clientBenchmarks[clientId];
      const platformBenchmark = platform === 'meta' ? clientBenchmark?.meta : clientBenchmark?.google;
      
      if (platformBenchmark) {
        const customValue = platformBenchmark[metric as keyof ClientBenchmark] as number | null;
        if (customValue !== null && customValue > 0) {
          return { value: customValue, isCustom: true };
        }
      }
      
      return { value: DEFAULT_BENCHMARKS[metric], isCustom: false };
    };

    // Unify campaigns from both platforms
    const campaigns: UnifiedCampaign[] = [
      ...metaCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: c.spend || 0,
        conversions: c.conversions || 0,
        clicks: c.clicks || 0,
        impressions: c.impressions || 0,
        ctr: c.ctr || 0,
        cpc: c.cpc || 0,
        cpa: c.cpa || 0,
        client_id: c.client_id,
        is_active: c.is_active,
        updated_at: c.updated_at,
        platform: 'meta' as const,
        frequency: c.frequency,
        objective: c.objective || null,
        clients: c.clients
      })),
      ...googleCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: c.spend || 0,
        conversions: c.conversions || 0,
        clicks: c.clicks || 0,
        impressions: c.impressions || 0,
        ctr: c.ctr || 0,
        cpc: c.cpc || 0,
        cpa: c.cpa || 0,
        client_id: c.client_id,
        is_active: c.is_active,
        updated_at: c.updated_at,
        platform: 'google' as const,
        frequency: c.frequency,
        objective: null, // Google campaigns don't have objective in our schema
        clients: c.clients
      }))
    ];

    // Extract sync information
    const lastSyncAt = syncInfo?.last_sync_at || null;
    const syncPeriod = syncInfo?.last_sync_period ? parseInt(syncInfo.last_sync_period) : null;

    // Build client ID to name map
    const clientNameMap: Record<string, string> = {};
    const clientAvatarMap: Record<string, string> = {};
    clientsWithBudget.forEach(c => {
      clientNameMap[c.id] = c.name;
      if (c.avatar) clientAvatarMap[c.id] = c.avatar;
    });

    // Calculate spend per client from ACTIVE campaigns (for KPIs/rankings)
    const clientSpend: Record<string, { meta: number; google: number; total: number }> = {};
    const clientCampaignCount: Record<string, number> = {};
    campaigns.forEach(c => {
      if (c.client_id) {
        if (!clientSpend[c.client_id]) {
          clientSpend[c.client_id] = { meta: 0, google: 0, total: 0 };
        }
        if (c.platform === 'meta') {
          clientSpend[c.client_id].meta += c.spend;
        } else {
          clientSpend[c.client_id].google += c.spend;
        }
        clientSpend[c.client_id].total += c.spend;
        clientCampaignCount[c.client_id] = (clientCampaignCount[c.client_id] || 0) + 1;
      }
    });

    // Calculate spend per client from ALL campaigns (for budget alerts - matches Clientes.tsx)
    const clientSpendForAlerts: Record<string, { meta: number; google: number; total: number }> = {};
    allMetaCampaigns.forEach((c: any) => {
      if (c.client_id) {
        if (!clientSpendForAlerts[c.client_id]) {
          clientSpendForAlerts[c.client_id] = { meta: 0, google: 0, total: 0 };
        }
        clientSpendForAlerts[c.client_id].meta += (c.spend || 0);
        clientSpendForAlerts[c.client_id].total += (c.spend || 0);
      }
    });
    allGoogleCampaigns.forEach((c: any) => {
      if (c.client_id) {
        if (!clientSpendForAlerts[c.client_id]) {
          clientSpendForAlerts[c.client_id] = { meta: 0, google: 0, total: 0 };
        }
        clientSpendForAlerts[c.client_id].google += (c.spend || 0);
        clientSpendForAlerts[c.client_id].total += (c.spend || 0);
      }
    });

    console.log(`[tv-dashboard-data] Found ${metaCampaigns.length} Meta campaigns (active), ${googleCampaigns.length} Google campaigns (active)`);
    console.log(`[tv-dashboard-data] Found ${allMetaCampaigns.length} Meta campaigns (all), ${allGoogleCampaigns.length} Google campaigns (all)`);
    console.log(`[tv-dashboard-data] ${clientsOnAlert.length} clients on alert`);

    // Calculate metrics using ALL campaigns (not just active) - matches Dashboard principal
    // This ensures TV Dashboard shows the same investment as other dashboards
    const totalInvestment = [...allMetaCampaigns, ...allGoogleCampaigns].reduce((sum, c: any) => sum + (Number(c.spend) || 0), 0);
    const totalLeads = [...allMetaCampaigns, ...allGoogleCampaigns].reduce((sum, c: any) => sum + (Number(c.conversions) || 0), 0);
    
    // For clicks/impressions, we still use active campaigns since ALL campaigns don't have these fields
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    
    console.log(`[tv-dashboard-data] KPIs: totalInvestment=${totalInvestment.toFixed(2)}, totalLeads=${totalLeads}`);
    
    const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // Calculate conversion rate (leads/clicks)
    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    
    // Calculate average frequency
    const campaignsWithFrequency = campaigns.filter(c => c.frequency && c.frequency > 0);
    const avgFrequency = campaignsWithFrequency.length > 0 
      ? campaignsWithFrequency.reduce((sum, c) => sum + (c.frequency || 0), 0) / campaignsWithFrequency.length 
      : 0;

    // Investment by platform (using ALL campaigns to match totalInvestment)
    const metaInvestment = allMetaCampaigns.reduce((sum, c: any) => sum + (Number(c.spend) || 0), 0);
    const googleInvestment = allGoogleCampaigns.reduce((sum, c: any) => sum + (Number(c.spend) || 0), 0);
    const investmentByPlatform: Record<string, number> = {
      'Meta Ads': metaInvestment,
      'Google Ads': googleInvestment
    };
    
    const platformData = Object.entries(investmentByPlatform)
      .filter(([_, spend]) => spend > 0)
      .map(([platform, spend]) => ({
        platform,
        spend,
        percentage: totalInvestment > 0 ? (spend / totalInvestment) * 100 : 0
      }))
      .sort((a, b) => b.spend - a.spend);

    // Clients without ACTIVE campaigns (status must be "active")
    const activeClientIds = new Set(
      campaigns
        .filter(c => {
          const status = typeof c.status === 'string' ? c.status.toLowerCase() : '';
          return status === 'active';
        })
        .map(c => c.client_id)
        .filter(Boolean)
    );

    const inactiveClients = allClients
      .filter(c => c.status !== 'inativo')
      .filter(c => !activeClientIds.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        activeCampaigns: 0
      }))
      .slice(0, 10);

    console.log(`[tv-dashboard-data] Clients total=${allClients.length}, activeClientsWithCampaign=${activeClientIds.size}, inactiveClients=${inactiveClients.length}`);

    // Generate alerts with client names and platform info
    const alerts: Array<{ 
      id: string; 
      type: string; 
      severity: string; 
      title: string; 
      description: string; 
      campaignId?: string;
      clientName?: string;
      clientAvatar?: string | null;
      campaignName?: string;
      value?: string;
      platform?: string;
    }> = [];

    campaigns.forEach(campaign => {
      const clientName = (campaign.clients as any)?.name || clientNameMap[campaign.client_id] || 'Cliente';
      const platformLabel = campaign.platform === 'meta' ? 'Meta' : 'Google';
      
      // Get benchmarks for this client and platform
      const cpaBenchmark = getBenchmark(campaign.client_id, campaign.platform, 'target_cpa');
      const ctrBenchmark = getBenchmark(campaign.client_id, campaign.platform, 'target_ctr');
      
      // CPA Alert - using client benchmark or default
      // Só gera alerta de CPA se:
      // 1. Tem conversões > 0 (CPA só faz sentido com conversões)
      // 2. Para Meta: objetivo deve ser de conversão/leads (não tráfego)
      // 3. Para Google: sempre gera (não temos objective no schema)
      const shouldCheckCPA = campaign.conversions > 0 && (
        campaign.platform === 'google' || 
        (campaign.platform === 'meta' && campaign.objective && CONVERSION_OBJECTIVES.includes(campaign.objective))
      );
      
      if (shouldCheckCPA && campaign.cpa && campaign.cpa > cpaBenchmark.value) {
        const benchmarkLabel = cpaBenchmark.isCustom ? 'meta do cliente' : 'padrão';
        const severity = campaign.cpa > cpaBenchmark.value * 1.5 ? 'critical' : 'warning';
        
        alerts.push({
          id: `cpa-${campaign.id}`,
          type: 'high_cpa',
          severity,
          title: 'CPA Alto',
          description: `CPA de R$ ${campaign.cpa.toFixed(2)} acima do ${benchmarkLabel} (R$ ${cpaBenchmark.value})`,
          campaignId: campaign.id,
          clientName: clientName,
          clientAvatar: clientAvatarMap[campaign.client_id] || null,
          campaignName: campaign.name,
          value: `R$ ${campaign.cpa.toFixed(2)}`,
          platform: platformLabel
        });
      }
      
      // CTR Alert - using client benchmark or default
      if (campaign.ctr !== undefined && campaign.ctr !== null && campaign.ctr < ctrBenchmark.value) {
        const benchmarkLabel = ctrBenchmark.isCustom ? 'meta do cliente' : 'padrão';
        const severity = campaign.ctr < ctrBenchmark.value * 0.5 ? 'critical' : 'warning';
        
        alerts.push({
          id: `ctr-${campaign.id}`,
          type: 'low_ctr',
          severity,
          title: 'CTR Baixo',
          description: `CTR de ${campaign.ctr.toFixed(2)}% abaixo do ${benchmarkLabel} (${ctrBenchmark.value}%)`,
          campaignId: campaign.id,
          clientName: clientName,
          clientAvatar: clientAvatarMap[campaign.client_id] || null,
          campaignName: campaign.name,
          value: `${campaign.ctr.toFixed(2)}%`,
          platform: platformLabel
        });
      }
    });

    // Sort campaigns by LEADS (conversions) for ranking - higher is better
    const campaignRanking = campaigns
      .filter(c => c.conversions && c.conversions > 0)
      .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        clientName: (c.clients as any)?.name || clientNameMap[c.client_id] || 'Cliente',
        clientAvatar: clientAvatarMap[c.client_id] || null,
        clientId: c.client_id,
        spend: c.spend,
        leads: c.conversions,
        cpa: c.cpa,
        ctr: c.ctr,
        status: c.status,
        platform: c.platform === 'meta' ? 'Meta' : 'Google'
      }));

    // Helper to check if account is restricted
    const isAccountRestricted = (client: any): { restricted: boolean; reason: string } => {
      const fbAccount = Array.isArray(client.facebook_ad_accounts)
        ? client.facebook_ad_accounts[0]
        : client.facebook_ad_accounts;
      
      if (!fbAccount) return { restricted: false, reason: '' };
      
      const isRestricted = fbAccount.is_restricted === true ||
                          fbAccount.can_advertise === false ||
                          (fbAccount.account_status && fbAccount.account_status !== 1);
      
      if (!isRestricted) return { restricted: false, reason: '' };
      
      let reason = 'Conta com restrição';
      const status = fbAccount.account_status;
      if (status === 2) reason = 'Conta desabilitada';
      else if (status === 3) reason = 'Pagamento pendente';
      else if (status === 7) reason = 'Conta pendente de revisão';
      else if (status === 9) reason = 'Conta em análise';
      else if (status === 101) reason = 'Conta fechada';
      else if (fbAccount.is_restricted) reason = 'Conta restrita';
      else if (fbAccount.can_advertise === false) reason = 'Não pode anunciar';
      
      return { restricted: true, reason };
    };

    // Format clients on alert with proper status mapping
    // Include clients with red/yellow status OR restricted accounts
    const formattedClientsOnAlert = clientsOnAlert
      .filter(c => {
        const status = c.calculated_status || c.status;
        const accountCheck = isAccountRestricted(c);
        return status === 'red' || status === 'yellow' || accountCheck.restricted;
      })
      .map(c => {
        // Map red/yellow to atencao/emergencial for frontend
        let displayStatus = c.calculated_status || c.status;
        if (displayStatus === 'red') displayStatus = 'emergencia';
        if (displayStatus === 'yellow') displayStatus = 'atencao';
        
        const accountCheck = isAccountRestricted(c);
        
        return {
          id: c.id,
          name: c.name,
          company: c.company,
          status: displayStatus,
          statusExplanation: c.status_explanation,
          avatar: c.avatar,
          leads: c.leads_generated || 0,
          avgCpl: c.avg_cpl || 0,
          isAccountRestricted: accountCheck.restricted,
          accountRestrictionReason: accountCheck.reason
        };
      })
      // Sort: restricted accounts first
      .sort((a, b) => {
        if (a.isAccountRestricted && !b.isAccountRestricted) return -1;
        if (!a.isAccountRestricted && b.isAccountRestricted) return 1;
        return 0;
      });

    // Calculate additional metrics
    const activeCampaigns = campaigns.length;
    const activeClients = new Set(campaigns.map(c => c.client_id)).size;
    const avgCPC = totalClicks > 0 ? totalInvestment / totalClicks : 0;

    // Get top performing clients (combined from both platforms)
    const clientPerformance = campaigns.reduce((acc, c) => {
      const clientId = c.client_id;
      if (!acc[clientId]) {
        acc[clientId] = {
          id: clientId,
          name: (c.clients as any)?.name || clientNameMap[clientId] || 'Cliente',
          spend: 0,
          conversions: 0,
          campaigns: 0,
          platforms: new Set<string>()
        };
      }
      acc[clientId].spend += c.spend;
      acc[clientId].conversions += c.conversions;
      acc[clientId].campaigns += 1;
      acc[clientId].platforms.add(c.platform === 'meta' ? 'Meta' : 'Google');
      return acc;
    }, {} as Record<string, any>);

    // Get top performing clients - sorted by LEADS (conversions), not CPA
    const topClients = Object.values(clientPerformance)
      .filter((c: any) => c.conversions > 0)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        spend: c.spend,
        conversions: c.conversions,
        campaigns: c.campaigns,
        cpa: c.spend / c.conversions,
        avatar: clientAvatarMap[c.id] || null,
        platforms: Array.from(c.platforms)
      }))
      .sort((a: any, b: any) => b.conversions - a.conversions)
      .slice(0, 6);

    // Calculate worst performing campaigns (from both platforms) - using benchmarks
    const worstCampaigns = campaigns
      .filter(c => {
        if (!c.conversions || c.conversions <= 0 || !c.cpa) return false;
        const cpaBenchmark = getBenchmark(c.client_id, c.platform, 'target_cpa');
        return c.cpa > cpaBenchmark.value;
      })
      .sort((a, b) => (b.cpa || 0) - (a.cpa || 0))
      .slice(0, 6)
      .map(c => ({
        id: c.id,
        name: c.name,
        clientName: (c.clients as any)?.name || clientNameMap[c.client_id] || 'Cliente',
        clientAvatar: clientAvatarMap[c.client_id] || null,
        cpa: c.cpa,
        spend: c.spend,
        conversions: c.conversions,
        platform: c.platform === 'meta' ? 'Meta' : 'Google'
      }));

    // === Calculate budget/balance alerts (for both Meta and Google) ===
    // ALIGNED WITH CLIENT LIST LOGIC (Clientes.tsx): Saldo + Gasto, critical + warning
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const budgetAlerts: BudgetAlert[] = [];

    // Priority levels:
    // 1 = Account disabled/funding issue (critical saldo)
    // 2 = Zero/negative balance (critical saldo)
    // 3 = Balance won't last (critical saldo, coverage < 80%)
    // 4 = Over budget (critical gasto, > 100%)
    // 5 = Balance tight (warning saldo, 80-100%)
    // 6 = Near budget (warning gasto, 90-100%)

    console.log(`[tv-dashboard-data] Processing ${clientsWithBudget.length} clients for budget alerts`);

    // Helper: Get balance sufficiency status (mirrors getBalanceSufficiency from Clientes.tsx)
    const getBalanceSufficiency = (
      balance: number,
      spend: number,
      syncPeriod: number,
      rechargeDay: number | null | undefined,
      paymentType: string
    ): { status: 'sufficient' | 'tight' | 'insufficient' | 'no-data'; coveragePercentage: number; daysRemaining: number; projectedSpend: number; dailySpend: number } => {
      // Skip postpaid
      if (paymentType === 'postpaid') {
        return { status: 'no-data', coveragePercentage: 0, daysRemaining: 0, projectedSpend: 0, dailySpend: 0 };
      }
      
      // If no sufficient data, return no-data
      if (syncPeriod === 0 || spend === 0 || balance === 0) {
        return { status: 'no-data', coveragePercentage: 0, daysRemaining: 0, projectedSpend: 0, dailySpend: 0 };
      }
      
      // Calculate daily spend
      const dailySpend = spend / syncPeriod;
      
      // Calculate next recharge date
      let nextRechargeDate: Date;
      
      if (rechargeDay && rechargeDay >= 1 && rechargeDay <= 31) {
        if (currentDay < rechargeDay) {
          nextRechargeDate = new Date(currentYear, currentMonth, rechargeDay);
        } else {
          nextRechargeDate = new Date(currentYear, currentMonth + 1, rechargeDay);
        }
        
        const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
        if (rechargeDay > maxDayInMonth) {
          nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
        }
      } else {
        // Fallback: last day of current month
        nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
      }
      
      const timeDiff = nextRechargeDate.getTime() - now.getTime();
      const daysRemaining = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
      
      // Calculate projected spend
      const projectedSpend = dailySpend * daysRemaining;
      
      // Calculate coverage percentage
      const coveragePercentage = (balance / projectedSpend) * 100;
      
      // Define status based on coverage (same as Clientes.tsx)
      let status: 'sufficient' | 'tight' | 'insufficient';
      if (coveragePercentage >= 100) {
        status = 'sufficient';
      } else if (coveragePercentage >= 80) {
        status = 'tight';
      } else {
        status = 'insufficient';
      }
      
      return { status, coveragePercentage, daysRemaining, projectedSpend, dailySpend };
    };

    // Helper: Get budget status (mirrors getBudgetStatus from Clientes.tsx)
    const getBudgetStatus = (
      monthlyBudget: number,
      actualSpend: number,
      syncPeriod: number
    ): { status: 'ok' | 'warning' | 'over' | 'no-budget'; percentage: number; expectedSpend: number } => {
      if (monthlyBudget === 0 || syncPeriod === 0) {
        return { status: 'no-budget', percentage: 0, expectedSpend: 0 };
      }
      
      const expectedSpend = (monthlyBudget / 30) * syncPeriod;
      const percentage = (actualSpend / expectedSpend) * 100;
      
      if (percentage <= 90) {
        return { status: 'ok', percentage, expectedSpend };
      } else if (percentage <= 100) {
        return { status: 'warning', percentage, expectedSpend };
      } else {
        return { status: 'over', percentage, expectedSpend };
      }
    };

    clientsWithBudget.forEach((client: any) => {
      // Skip inactive clients
      if (client.status === 'inativo') return;

      const spendData = clientSpendForAlerts[client.id] || { meta: 0, google: 0, total: 0 };
      const syncPeriodValue = parseInt(client.last_sync_period || '0') || 0;

      // =====================
      // SALDO (MESMA LÓGICA DA TELA DE CLIENTES)
      // - Usa o saldo da conta do Meta (facebook_ad_accounts)
      // - Usa o gasto médio baseado no período sincronizado
      // =====================
      const fbAccount = Array.isArray(client.facebook_ad_accounts)
        ? client.facebook_ad_accounts[0]
        : client.facebook_ad_accounts;

      const balance = fbAccount?.balance || 0;
      const accountStatus = fbAccount?.account_status;
      const hasFundingIssues = fbAccount?.has_funding_issues || false;
      const disableReason = fbAccount?.disable_reason || '';

      // A tela de Clientes usa principalmente payment_type para esconder saldo em pós-pago.
      const paymentType = client.payment_type || 'prepaid';
      const isPostpaid = paymentType === 'postpaid';

      // Preferir meta_recharge_day do cliente; fallback para o recharge_day da conta
      const rechargeDay = client.meta_recharge_day ?? fbAccount?.recharge_day ?? null;

      // 1) Alertas críticos imediatos (conta desabilitada / problema de fundos)
      if (!isPostpaid && fbAccount && accountStatus !== undefined && accountStatus !== null) {
        const isDisabled = accountStatus !== 1;
        const disableReasonIsFunding = typeof disableReason === 'string' && disableReason.toLowerCase().includes('funding');

        if (isDisabled || hasFundingIssues || disableReasonIsFunding) {
          let message = 'Conta desabilitada';
          if (hasFundingIssues || disableReasonIsFunding) {
            message = 'Problema de fundos';
          } else if (disableReason) {
            message = String(disableReason).substring(0, 30);
          }

          budgetAlerts.push({
            id: `${client.id}-meta-disabled`,
            name: client.name,
            avatar: client.avatar,
            category: 'saldo',
            severity: 'critical',
            balance,
            spend: spendData.total,
            budget: 0,
            daysRemaining: 0,
            projectedSpend: 0,
            percentage: 0,
            coveragePercentage: 0,
            message,
            platform: 'Meta',
            sortPriority: 1,
          });
        }
      }

      // 2) Saldo zero/negativo (quando há gasto no período)
      if (!isPostpaid && fbAccount && balance <= 0 && spendData.total > 0) {
        const existingSaldoAlert = budgetAlerts.find(
          (a) => a.id.startsWith(`${client.id}-meta-`) && a.category === 'saldo'
        );

        if (!existingSaldoAlert) {
          budgetAlerts.push({
            id: `${client.id}-meta-zero`,
            name: client.name,
            avatar: client.avatar,
            category: 'saldo',
            severity: 'critical',
            balance,
            spend: spendData.total,
            budget: 0,
            daysRemaining: 0,
            projectedSpend: 0,
            percentage: 0,
            coveragePercentage: 0,
            message: balance < 0 ? 'Saldo negativo' : 'Saldo zerado',
            platform: 'Meta',
            sortPriority: 2,
          });
        }
      }

      // 3) Suficiência de saldo até recarga (mesma regra de cobertura 100% / 80%)
      if (!isPostpaid && balance > 0) {
        const sufficiency = getBalanceSufficiency(
          balance,
          // A tela de Clientes calcula com o spend consolidado do período
          spendData.total,
          syncPeriodValue,
          rechargeDay,
          paymentType
        );

        if (sufficiency.status !== 'no-data' && sufficiency.status !== 'sufficient') {
          const existingCriticalAlert = budgetAlerts.find(
            (a) => a.id.startsWith(`${client.id}-meta-`) && a.category === 'saldo' && a.severity === 'critical'
          );

          if (!existingCriticalAlert) {
            if (sufficiency.status === 'insufficient') {
              budgetAlerts.push({
                id: `${client.id}-meta-balance`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'critical',
                balance,
                spend: spendData.total,
                budget: 0,
                daysRemaining: sufficiency.daysRemaining,
                projectedSpend: sufficiency.projectedSpend,
                percentage: 0,
                coveragePercentage: sufficiency.coveragePercentage,
                message: `Saldo insuficiente (${sufficiency.coveragePercentage.toFixed(0)}%)`,
                platform: 'Meta',
                sortPriority: 3,
              });
            }

            if (sufficiency.status === 'tight') {
              budgetAlerts.push({
                id: `${client.id}-meta-balance-warning`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'warning',
                balance,
                spend: spendData.total,
                budget: 0,
                daysRemaining: sufficiency.daysRemaining,
                projectedSpend: sufficiency.projectedSpend,
                percentage: 0,
                coveragePercentage: sufficiency.coveragePercentage,
                message: `Saldo apertado (${sufficiency.coveragePercentage.toFixed(0)}%)`,
                platform: 'Meta',
                sortPriority: 5,
              });
            }
          }
        }
      }

      // =====================
      // GASTO (MESMA LÓGICA DA TELA DE CLIENTES)
      // - Usa orçamento consolidado (meta + google) quando aplicável
      // - Compara gasto do período sincronizado vs gasto esperado (budget/30 * syncPeriod)
      // =====================
      const metaBudget = client.meta_monthly_budget || 0;
      const googleBudget = client.google_monthly_budget || 0;
      const hasMetaAccount = !!client.ad_account_id;
      const hasGoogleAccount = !!client.google_account_id;

      let consolidatedBudget = 0;
      if (metaBudget > 0 && googleBudget > 0) {
        consolidatedBudget = metaBudget + googleBudget;
      } else if ((hasMetaAccount && hasGoogleAccount) && (metaBudget > 0 || googleBudget > 0)) {
        consolidatedBudget = client.monthly_budget || (metaBudget + googleBudget);
      } else if (metaBudget > 0 || googleBudget > 0) {
        consolidatedBudget = metaBudget + googleBudget;
      } else {
        consolidatedBudget = client.monthly_budget || 0;
      }

      if (consolidatedBudget > 0) {
        const budgetStatus = getBudgetStatus(consolidatedBudget, spendData.total, syncPeriodValue);

        if (budgetStatus.status === 'over') {
          budgetAlerts.push({
            id: `${client.id}-total-budget`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'critical',
            balance,
            spend: spendData.total,
            budget: consolidatedBudget,
            daysRemaining: 0,
            projectedSpend: budgetStatus.expectedSpend,
            percentage: budgetStatus.percentage,
            coveragePercentage: 0,
            message: `Gasto ${budgetStatus.percentage.toFixed(0)}% do planejado`,
            platform: 'Total',
            sortPriority: 4,
          });
        }

        if (budgetStatus.status === 'warning') {
          budgetAlerts.push({
            id: `${client.id}-total-budget-warning`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'warning',
            balance,
            spend: spendData.total,
            budget: consolidatedBudget,
            daysRemaining: 0,
            projectedSpend: budgetStatus.expectedSpend,
            percentage: budgetStatus.percentage,
            coveragePercentage: 0,
            message: `Gasto ${budgetStatus.percentage.toFixed(0)}% do planejado`,
            platform: 'Total',
            sortPriority: 6,
          });
        }
      }
    });

    // Sort by priority first, then by "worst" metric within priority
    budgetAlerts.sort((a, b) => {
      // First by priority
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      // Within same priority, sort by "worst" value
      if (a.category === 'saldo') {
        // Lower coverage is worse
        return a.coveragePercentage - b.coveragePercentage;
      } else {
        // Higher percentage is worse
        return b.percentage - a.percentage;
      }
    });

    console.log(`[tv-dashboard-data] Found ${budgetAlerts.length} budget alerts, ${inactiveClients.length} inactive clients`);

    const response = {
      company: {
        id: company.id,
        name: company.name
      },
      lastSync: new Date().toISOString(),
      syncInfo: {
        lastSyncAt,
        syncPeriod
      },
      metrics: {
        totalInvestment,
        totalLeads,
        totalClicks,
        averageCPA,
        averageCTR,
        conversionRate,
        avgFrequency,
        activeCampaigns,
        activeClients,
        avgCPC,
        investmentChange: 0,
        leadsChange: 0,
        cpaChange: 0,
        ctrChange: 0,
        metaCampaigns: metaCampaigns.length,
        googleCampaigns: googleCampaigns.length
      },
      alerts: alerts.slice(0, 10),
      campaigns: campaignRanking,
      clientsOnAlert: formattedClientsOnAlert,
      topClients,
      worstCampaigns,
      budgetAlerts: budgetAlerts.slice(0, 10),
      platformData,
      inactiveClients
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
