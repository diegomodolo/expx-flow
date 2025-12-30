// TV Dashboard Data Edge Function - Public access
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

    // Fetch Meta campaigns, Google campaigns, clients with budget/balance data in parallel
    const [metaCampaignsResult, googleCampaignsResult, clientsResult, clientsWithBudgetResult, allClientsResult, syncInfoResult, googleAccountsResult] = await Promise.all([
      // Meta Campaigns with client info
      supabase
        .from('campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at, platforms, frequency,
          clients!inner(id, name, company)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true),
      
      // Google Campaigns with client info
      supabase
        .from('google_campaigns')
        .select(`
          id, name, status, spend, conversions, clicks, impressions, ctr, cpc, cpa, client_id, is_active, updated_at, frequency,
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
      
      // All clients with budget and balance info (Meta and Google)
      supabase
        .from('clients')
        .select(`
          id, name, avatar, monthly_budget, last_sync_period, active_campaigns, status,
          meta_monthly_budget, meta_payment_type, meta_recharge_day,
          google_monthly_budget, google_payment_type, google_recharge_day,
          payment_type,
          facebook_ad_accounts(balance, recharge_day, account_status, has_funding_issues, disable_reason),
          google_ads_accounts(id, account_status, balance)
        `)
        .eq('company_id', company.id),
      
      // All clients (to find those without active campaigns)
      supabase
        .from('clients')
        .select('id, name, avatar, status')
        .eq('company_id', company.id),
      
      // Get most recent sync info
      supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', company.id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1),
      
      // Google Ads accounts for balance info
      supabase
        .from('google_ads_accounts')
        .select('id, client_id, balance')
        .eq('company_id', company.id)
    ]);

    const metaCampaigns = metaCampaignsResult.data || [];
    const googleCampaigns = googleCampaignsResult.data || [];
    const clientsOnAlert = clientsResult.data || [];
    const clientsWithBudget = clientsWithBudgetResult.data || [];
    const allClients = allClientsResult.data || [];
    const syncInfo = syncInfoResult.data?.[0] || null;
    const googleAccounts = googleAccountsResult.data || [];

    // Build Google account balance map
    const googleBalanceMap: Record<string, number> = {};
    googleAccounts.forEach(acc => {
      if (acc.client_id) {
        googleBalanceMap[acc.client_id] = acc.balance || 0;
      }
    });

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

    // Calculate spend per client from campaigns (by platform)
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

    console.log(`[tv-dashboard-data] Found ${metaCampaigns.length} Meta campaigns, ${googleCampaigns.length} Google campaigns, ${clientsOnAlert.length} clients on alert`);

    // Calculate metrics (combined from both platforms)
    const totalInvestment = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    
    const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // Calculate conversion rate (leads/clicks)
    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    
    // Calculate average frequency
    const campaignsWithFrequency = campaigns.filter(c => c.frequency && c.frequency > 0);
    const avgFrequency = campaignsWithFrequency.length > 0 
      ? campaignsWithFrequency.reduce((sum, c) => sum + (c.frequency || 0), 0) / campaignsWithFrequency.length 
      : 0;

    // Investment by platform (combined)
    const investmentByPlatform: Record<string, number> = {
      'Meta Ads': 0,
      'Google Ads': 0
    };
    campaigns.forEach(c => {
      if (c.platform === 'meta') {
        investmentByPlatform['Meta Ads'] += c.spend;
      } else {
        investmentByPlatform['Google Ads'] += c.spend;
      }
    });
    
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
      
      if (campaign.cpa && campaign.cpa > 50) {
        alerts.push({
          id: `cpa-${campaign.id}`,
          type: 'high_cpa',
          severity: 'critical',
          title: 'CPA Alto',
          description: `CPA de R$ ${campaign.cpa.toFixed(2)} está acima do limite`,
          campaignId: campaign.id,
          clientName: clientName,
          clientAvatar: clientAvatarMap[campaign.client_id] || null,
          campaignName: campaign.name,
          value: `R$ ${campaign.cpa.toFixed(2)}`,
          platform: platformLabel
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
          clientAvatar: clientAvatarMap[campaign.client_id] || null,
          campaignName: campaign.name,
          value: `${campaign.ctr.toFixed(2)}%`,
          platform: platformLabel
        });
      }
    });

    // Sort campaigns by CPA for ranking, include client name and platform
    const campaignRanking = campaigns
      .filter(c => c.conversions && c.conversions > 0)
      .sort((a, b) => (a.cpa || 999) - (b.cpa || 999))
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
      .sort((a: any, b: any) => a.cpa - b.cpa)
      .slice(0, 6);

    // Calculate worst performing campaigns (from both platforms)
    const worstCampaigns = campaigns
      .filter(c => c.conversions && c.conversions > 0 && c.cpa && c.cpa > 50)
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
    // Aligned with client list logic: Saldo + Gasto, critical + warning
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

    clientsWithBudget.forEach(client => {
      // Skip inactive clients
      if (client.status === 'inativo') return;
      
      const spendData = clientSpend[client.id] || { meta: 0, google: 0, total: 0 };
      const syncPeriodValue = parseInt(client.last_sync_period || '0') || 7;
      
      // ========== META ALERTS ==========
      const metaMonthlyBudget = client.meta_monthly_budget || 0;
      const fbAccount = Array.isArray(client.facebook_ad_accounts) 
        ? client.facebook_ad_accounts[0] 
        : client.facebook_ad_accounts;
      const metaBalance = fbAccount?.balance || 0;
      const metaAccountStatus = fbAccount?.account_status;
      const metaHasFundingIssues = fbAccount?.has_funding_issues || false;
      const metaDisableReason = fbAccount?.disable_reason || '';
      const metaRechargeDay = client.meta_recharge_day || fbAccount?.recharge_day;
      const metaDailySpend = syncPeriodValue > 0 ? spendData.meta / syncPeriodValue : 0;
      const metaPaymentType = client.meta_payment_type || client.payment_type || 'prepaid';
      const isMetaPostpaid = metaPaymentType === 'postpaid';
      
      // --- META SALDO ALERTS (skip if postpaid) ---
      if (!isMetaPostpaid && fbAccount) {
        // CRITICAL: Account disabled or has funding issues
        if (metaAccountStatus !== undefined && metaAccountStatus !== null) {
          const isDisabled = metaAccountStatus !== 1;
          const hasFundingFlag = metaHasFundingIssues === true;
          const disableReasonIsFunding = metaDisableReason?.toLowerCase().includes('funding');
          
          if (isDisabled || hasFundingFlag || disableReasonIsFunding) {
            let message = 'Conta desabilitada';
            if (hasFundingFlag || disableReasonIsFunding) {
              message = 'Problema de fundos';
            } else if (metaDisableReason) {
              message = metaDisableReason.substring(0, 30);
            }
            
            budgetAlerts.push({
              id: `${client.id}-meta-disabled`,
              name: client.name,
              avatar: client.avatar,
              category: 'saldo',
              severity: 'critical',
              balance: metaBalance,
              spend: spendData.meta,
              budget: metaMonthlyBudget,
              daysRemaining: 0,
              projectedSpend: 0,
              percentage: 0,
              coveragePercentage: 0,
              message,
              platform: 'Meta',
              sortPriority: 1
            });
          }
        }
        
        // CRITICAL: Zero or negative balance
        if (metaBalance <= 0) {
          const existingDisabledAlert = budgetAlerts.find(a => a.id === `${client.id}-meta-disabled`);
          if (!existingDisabledAlert) {
            budgetAlerts.push({
              id: `${client.id}-meta-zero`,
              name: client.name,
              avatar: client.avatar,
              category: 'saldo',
              severity: 'critical',
              balance: metaBalance,
              spend: spendData.meta,
              budget: metaMonthlyBudget,
              daysRemaining: 0,
              projectedSpend: 0,
              percentage: 0,
              coveragePercentage: 0,
              message: metaBalance < 0 ? 'Saldo negativo' : 'Saldo zerado',
              platform: 'Meta',
              sortPriority: 2
            });
          }
        }
        
        // Balance coverage check (insufficient or tight)
        if (metaBalance > 0 && metaDailySpend > 0) {
          let nextRechargeDate: Date;
          
          if (metaRechargeDay && metaRechargeDay >= 1 && metaRechargeDay <= 31) {
            if (currentDay < metaRechargeDay) {
              nextRechargeDate = new Date(currentYear, currentMonth, metaRechargeDay);
            } else {
              nextRechargeDate = new Date(currentYear, currentMonth + 1, metaRechargeDay);
            }
            
            const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
            if (metaRechargeDay > maxDayInMonth) {
              nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
            }
          } else {
            nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
          }
          
          const timeDiff = nextRechargeDate.getTime() - now.getTime();
          const daysRemaining = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
          const projectedSpend = metaDailySpend * daysRemaining;
          const coveragePercentage = (metaBalance / projectedSpend) * 100;
          
          // Check if we already have a more critical alert for this client+platform
          const existingCriticalAlert = budgetAlerts.find(a => 
            a.id.startsWith(`${client.id}-meta-`) && a.category === 'saldo' && a.severity === 'critical'
          );
          
          if (!existingCriticalAlert) {
            if (coveragePercentage < 80) {
              // CRITICAL: Won't last
              budgetAlerts.push({
                id: `${client.id}-meta-balance`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'critical',
                balance: metaBalance,
                spend: spendData.meta,
                budget: metaMonthlyBudget,
                daysRemaining,
                projectedSpend,
                percentage: 0,
                coveragePercentage,
                message: `Saldo não dura ${daysRemaining}d`,
                platform: 'Meta',
                sortPriority: 3
              });
            } else if (coveragePercentage < 100) {
              // WARNING: Tight balance (80-100%)
              budgetAlerts.push({
                id: `${client.id}-meta-balance-warning`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'warning',
                balance: metaBalance,
                spend: spendData.meta,
                budget: metaMonthlyBudget,
                daysRemaining,
                projectedSpend,
                percentage: 0,
                coveragePercentage,
                message: `Saldo apertado (${coveragePercentage.toFixed(0)}%)`,
                platform: 'Meta',
                sortPriority: 5
              });
            }
          }
        }
      }
      
      // --- META GASTO ALERTS ---
      if (metaMonthlyBudget > 0 && syncPeriodValue > 0 && spendData.meta > 0) {
        const expectedSpend = (metaMonthlyBudget / 30) * syncPeriodValue;
        const percentage = (spendData.meta / expectedSpend) * 100;
        
        if (percentage > 100) {
          // CRITICAL: Over budget
          budgetAlerts.push({
            id: `${client.id}-meta-budget`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'critical',
            balance: metaBalance,
            spend: spendData.meta,
            budget: metaMonthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Meta',
            sortPriority: 4
          });
        } else if (percentage >= 90) {
          // WARNING: Near budget (90-100%)
          budgetAlerts.push({
            id: `${client.id}-meta-budget-warning`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'warning',
            balance: metaBalance,
            spend: spendData.meta,
            budget: metaMonthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Meta',
            sortPriority: 6
          });
        }
      }
      
      // ========== GOOGLE ALERTS ==========
      const googleMonthlyBudget = client.google_monthly_budget || 0;
      const googleAccount = Array.isArray(client.google_ads_accounts) 
        ? client.google_ads_accounts[0] 
        : client.google_ads_accounts;
      const googleBalance = googleAccount?.balance || googleBalanceMap[client.id] || 0;
      const googleAccountStatus = googleAccount?.account_status;
      const googleRechargeDay = client.google_recharge_day;
      const googleDailySpend = syncPeriodValue > 0 ? spendData.google / syncPeriodValue : 0;
      const googlePaymentType = client.google_payment_type || client.payment_type || 'prepaid';
      const isGooglePostpaid = googlePaymentType === 'postpaid';
      
      // --- GOOGLE SALDO ALERTS (skip if postpaid) ---
      if (!isGooglePostpaid && googleAccount) {
        // CRITICAL: Account disabled
        if (googleAccountStatus !== undefined && googleAccountStatus !== null && googleAccountStatus !== 1) {
          budgetAlerts.push({
            id: `${client.id}-google-disabled`,
            name: client.name,
            avatar: client.avatar,
            category: 'saldo',
            severity: 'critical',
            balance: googleBalance,
            spend: spendData.google,
            budget: googleMonthlyBudget,
            daysRemaining: 0,
            projectedSpend: 0,
            percentage: 0,
            coveragePercentage: 0,
            message: 'Conta desabilitada',
            platform: 'Google',
            sortPriority: 1
          });
        }
        
        // CRITICAL: Zero or negative balance
        if (googleBalance <= 0) {
          const existingDisabledAlert = budgetAlerts.find(a => a.id === `${client.id}-google-disabled`);
          if (!existingDisabledAlert) {
            budgetAlerts.push({
              id: `${client.id}-google-zero`,
              name: client.name,
              avatar: client.avatar,
              category: 'saldo',
              severity: 'critical',
              balance: googleBalance,
              spend: spendData.google,
              budget: googleMonthlyBudget,
              daysRemaining: 0,
              projectedSpend: 0,
              percentage: 0,
              coveragePercentage: 0,
              message: googleBalance < 0 ? 'Saldo negativo' : 'Saldo zerado',
              platform: 'Google',
              sortPriority: 2
            });
          }
        }
        
        // Balance coverage check
        if (googleBalance > 0 && googleDailySpend > 0) {
          let nextRechargeDate: Date;
          
          if (googleRechargeDay && googleRechargeDay >= 1 && googleRechargeDay <= 31) {
            if (currentDay < googleRechargeDay) {
              nextRechargeDate = new Date(currentYear, currentMonth, googleRechargeDay);
            } else {
              nextRechargeDate = new Date(currentYear, currentMonth + 1, googleRechargeDay);
            }
            
            const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
            if (googleRechargeDay > maxDayInMonth) {
              nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
            }
          } else {
            nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
          }
          
          const timeDiff = nextRechargeDate.getTime() - now.getTime();
          const daysRemaining = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
          const projectedSpend = googleDailySpend * daysRemaining;
          const coveragePercentage = (googleBalance / projectedSpend) * 100;
          
          const existingCriticalAlert = budgetAlerts.find(a => 
            a.id.startsWith(`${client.id}-google-`) && a.category === 'saldo' && a.severity === 'critical'
          );
          
          if (!existingCriticalAlert) {
            if (coveragePercentage < 80) {
              budgetAlerts.push({
                id: `${client.id}-google-balance`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'critical',
                balance: googleBalance,
                spend: spendData.google,
                budget: googleMonthlyBudget,
                daysRemaining,
                projectedSpend,
                percentage: 0,
                coveragePercentage,
                message: `Saldo não dura ${daysRemaining}d`,
                platform: 'Google',
                sortPriority: 3
              });
            } else if (coveragePercentage < 100) {
              budgetAlerts.push({
                id: `${client.id}-google-balance-warning`,
                name: client.name,
                avatar: client.avatar,
                category: 'saldo',
                severity: 'warning',
                balance: googleBalance,
                spend: spendData.google,
                budget: googleMonthlyBudget,
                daysRemaining,
                projectedSpend,
                percentage: 0,
                coveragePercentage,
                message: `Saldo apertado (${coveragePercentage.toFixed(0)}%)`,
                platform: 'Google',
                sortPriority: 5
              });
            }
          }
        }
      }
      
      // --- GOOGLE GASTO ALERTS ---
      if (googleMonthlyBudget > 0 && syncPeriodValue > 0 && spendData.google > 0) {
        const expectedSpend = (googleMonthlyBudget / 30) * syncPeriodValue;
        const percentage = (spendData.google / expectedSpend) * 100;
        
        if (percentage > 100) {
          budgetAlerts.push({
            id: `${client.id}-google-budget`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'critical',
            balance: googleBalance,
            spend: spendData.google,
            budget: googleMonthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Google',
            sortPriority: 4
          });
        } else if (percentage >= 90) {
          budgetAlerts.push({
            id: `${client.id}-google-budget-warning`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'warning',
            balance: googleBalance,
            spend: spendData.google,
            budget: googleMonthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Google',
            sortPriority: 6
          });
        }
      }
      
      // ========== CONSOLIDATED GASTO ALERTS (when no per-platform budget) ==========
      const hasMetaBudget = (client.meta_monthly_budget || 0) > 0;
      const hasGoogleBudget = (client.google_monthly_budget || 0) > 0;
      const hasGenericBudget = (client.monthly_budget || 0) > 0;
      
      if (!hasMetaBudget && !hasGoogleBudget && hasGenericBudget && syncPeriodValue > 0 && spendData.total > 0) {
        const monthlyBudget = client.monthly_budget || 0;
        const expectedSpend = (monthlyBudget / 30) * syncPeriodValue;
        const percentage = (spendData.total / expectedSpend) * 100;
        
        if (percentage > 100) {
          budgetAlerts.push({
            id: `${client.id}-total-budget`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'critical',
            balance: 0,
            spend: spendData.total,
            budget: monthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Total',
            sortPriority: 4
          });
        } else if (percentage >= 90) {
          budgetAlerts.push({
            id: `${client.id}-total-budget-warning`,
            name: client.name,
            avatar: client.avatar,
            category: 'gasto',
            severity: 'warning',
            balance: 0,
            spend: spendData.total,
            budget: monthlyBudget,
            daysRemaining: 0,
            projectedSpend: expectedSpend,
            percentage,
            coveragePercentage: 0,
            message: `Gasto ${percentage.toFixed(0)}% do planejado`,
            platform: 'Total',
            sortPriority: 6
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
