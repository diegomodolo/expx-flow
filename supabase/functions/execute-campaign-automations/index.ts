// ============================================================
// EDGE FUNCTION: execute-campaign-automations
// Nova arquitetura em 3 fases:
// 1. COLETA - Buscar toda estrutura do Facebook (campanhas > conjuntos > criativos)
// 2. MÉTRICAS - Buscar indicadores para cada entidade
// 3. APLICAÇÃO - Aplicar regras uma por uma
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ INTERFACES ============

interface AutomationRule {
  id: string;
  rule_name: string;
  rule_description?: string;
  company_id: string;
  client_id?: string;
  entity_type: 'campaign' | 'adset' | 'ad';
  action_type: string;
  conditions: any;
  action_config: any;
  time_window_days: number;
  scope_filters?: any;
  budget_safety_limits?: {
    max_daily_budget_increase_percent?: number;
    max_daily_budget_decrease_percent?: number;
  };
  execution_limits?: {
    max_executions_per_day?: number;
    cooldown_hours?: number;
    entity_cooldown_days?: number;
  };
  campaign_objectives?: string[];
  is_active: boolean;
}

interface MetricsData {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

interface AdData {
  id: string;
  name: string;
  status: string;
  created_time?: string;
  metrics?: MetricsData;
}

interface AdSetData {
  id: string;
  name: string;
  status: string;
  created_time?: string;
  metrics?: MetricsData;
  ads: AdData[];
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time?: string;
  metrics?: MetricsData;
  adsets: AdSetData[];
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let executionId: string | undefined;
  let companyId: string | undefined;
  let clientId: string | undefined;
  let logEntryId: string | undefined;
  const execStartTime = Date.now();

  try {
    const body = await req.json();
    clientId = body.client_id;
    executionId = body.execution_id || crypto.randomUUID();
    const scheduledExecution = body.scheduled_execution || false;

    console.log('🚀 Starting automation execution (new architecture):', { clientId, executionId });

    // ===== BUSCAR REGRAS ATIVAS =====
    const { data: rules, error: rulesError } = await supabase
      .from('campaign_automation_rules')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('is_template', false)
      .order('rule_order', { ascending: true });

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma regra ativa encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    companyId = rules[0].company_id;
    console.log(`📋 Found ${rules.length} active rules`);

    // Criar log de execução
    if (!scheduledExecution) {
      const { data: logEntry } = await supabase
        .from('automation_execution_logs')
        .insert({
          company_id: companyId,
          client_id: clientId,
          execution_id: executionId,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      logEntryId = logEntry?.id;
    }

    // ===== BUSCAR INTEGRAÇÃO FACEBOOK =====
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integração com Facebook não encontrada ou inativa');
    }

    const accessToken = integration.access_token;

    // Buscar configurações
    const { data: automationSettings } = await supabase
      .from('automation_settings')
      .select('campaign_name_prefix')
      .eq('company_id', companyId)
      .single();

    const namePrefix = automationSettings?.campaign_name_prefix || 'SHEGrowth';

    // Buscar Ad Account
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, facebook_ad_accounts!inner(account_id)')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData?.facebook_ad_accounts) {
      throw new Error('Cliente ou conta de anúncios não encontrada');
    }

    const adAccountId = clientData.facebook_ad_accounts.account_id;
    console.log(`📱 Ad Account: ${adAccountId}`);

    // ================================================================
    // FASE 1: COLETA DE ESTRUTURA
    // ================================================================
    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Fase 1',
      status: 'processing',
      rule_name: 'Coleta',
      message: '📡 Buscando estrutura completa do Facebook...',
      metadata: { phase: 'collecting' }
    });

    console.log('\n========== FASE 1: COLETA DE ESTRUTURA ==========');
    
    const hierarchy = await collectFullHierarchy(
      adAccountId, 
      accessToken, 
      supabase, 
      executionId, 
      companyId, 
      clientId
    );

    const totalCampaigns = hierarchy.length;
    const totalAdsets = hierarchy.reduce((acc, c) => acc + c.adsets.length, 0);
    const totalAds = hierarchy.reduce((acc, c) => 
      acc + c.adsets.reduce((acc2, a) => acc2 + a.ads.length, 0), 0
    );

    console.log(`✅ Estrutura coletada: ${totalCampaigns} campanhas, ${totalAdsets} conjuntos, ${totalAds} criativos`);

    // Log da estrutura completa
    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Estrutura',
      status: 'actioned',
      rule_name: 'Estrutura Completa',
      message: `✅ ${totalCampaigns} campanhas, ${totalAdsets} conjuntos, ${totalAds} criativos`,
      metadata: { 
        phase: 'collecting',
        hierarchy: hierarchy,
        total_campaigns: totalCampaigns,
        total_adsets: totalAdsets,
        total_ads: totalAds
      }
    });

    // ================================================================
    // FASE 2: BUSCA DE MÉTRICAS
    // ================================================================
    console.log('\n========== FASE 2: BUSCA DE MÉTRICAS ==========');
    
    // Determinar janela máxima entre as regras
    const maxTimeWindow = Math.max(...rules.map((r: AutomationRule) => r.time_window_days || 7));
    console.log(`📊 Janela de tempo máxima: ${maxTimeWindow} dias`);

    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Fase 2',
      status: 'processing',
      rule_name: 'Métricas',
      message: `📊 Buscando métricas (janela de ${maxTimeWindow} dias)...`,
      metadata: { phase: 'metrics' }
    });

    // Buscar métricas para toda a hierarquia
    await fetchMetricsForHierarchy(hierarchy, maxTimeWindow, accessToken);

    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Métricas',
      status: 'actioned',
      rule_name: 'Métricas Carregadas',
      message: `✅ Métricas carregadas para todas as entidades`,
      metadata: { phase: 'metrics' }
    });

    // ================================================================
    // FASE 3: APLICAÇÃO DE REGRAS
    // ================================================================
    console.log('\n========== FASE 3: APLICAÇÃO DE REGRAS ==========');
    
    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Fase 3',
      status: 'processing',
      rule_name: 'Aplicação',
      message: `📋 Aplicando ${rules.length} regras...`,
      metadata: { phase: 'applying' }
    });

    let totalActioned = 0;
    let totalSkipped = 0;
    let totalIgnored = 0;
    let totalErrors = 0;

    // Processar regra por regra
    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
      const rule = rules[ruleIndex] as AutomationRule;
      
      console.log(`\n📋 Regra ${ruleIndex + 1}/${rules.length}: ${rule.rule_name}`);
      console.log(`   Tipo: ${rule.entity_type}, Ação: ${rule.action_type}`);
      console.log(`   Objetivos: ${rule.campaign_objectives?.join(', ') || 'Todos'}`);

      const ruleResult = await applyRuleToHierarchy(
        rule,
        hierarchy,
        executionId,
        accessToken,
        supabase,
        companyId,
        clientId,
        namePrefix,
        adAccountId
      );

      totalActioned += ruleResult.actioned;
      totalSkipped += ruleResult.skipped;
      totalIgnored += ruleResult.ignored;
      totalErrors += ruleResult.errors;

      console.log(`   ✅ Regra concluída: ${ruleResult.actioned} ações, ${ruleResult.skipped} ignorados, ${ruleResult.ignored} objetivo ≠`);
    }

    // ================================================================
    // CONCLUSÃO
    // ================================================================
    console.log('\n========== CONCLUSÃO ==========');
    console.log(`✨ Total: ${totalActioned} ações, ${totalSkipped} ignorados, ${totalIgnored} objetivo ≠, ${totalErrors} erros`);

    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: 'system',
      entity_name: 'Sistema',
      status: totalActioned > 0 ? 'actioned' : 'skipped',
      rule_name: 'Conclusão',
      message: `✨ Execução concluída: ${totalActioned} ações, ${totalSkipped} ignorados, ${totalIgnored} objetivo ≠, ${totalErrors} erros`
    });

    // Atualizar log principal
    if (!scheduledExecution && logEntryId) {
      await supabase
        .from('automation_execution_logs')
        .update({
          status: totalErrors > 0 ? (totalActioned > 0 ? 'partial' : 'failed') : 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - execStartTime,
          actions_taken: totalActioned,
          total_rules_evaluated: rules.length,
          execution_details: { totalActioned, totalSkipped, totalIgnored, totalErrors }
        })
        .eq('id', logEntryId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalActioned,
        totalSkipped,
        totalIgnored,
        totalErrors,
        total_actioned: totalActioned
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in execute-campaign-automations:', error);
    
    if (executionId && companyId && clientId) {
      await logProgress(supabase, executionId, companyId, clientId, {
        entity_type: 'system',
        entity_name: 'Sistema',
        status: 'error',
        rule_name: 'Erro',
        message: `❌ Erro: ${error.message}`
      });
    }
    
    if (logEntryId) {
      await supabase
        .from('automation_execution_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - execStartTime,
          error_message: error.message
        })
        .eq('id', logEntryId);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============ FUNÇÕES AUXILIARES ============

// Mapear objetivos do Facebook (API antiga e nova ODAX)
function normalizeObjective(objective: string): string[] {
  const objectiveMap: Record<string, string[]> = {
    // Reconhecimento
    'BRAND_AWARENESS': ['OUTCOME_AWARENESS', 'BRAND_AWARENESS'],
    'REACH': ['OUTCOME_AWARENESS', 'REACH'],
    'OUTCOME_AWARENESS': ['OUTCOME_AWARENESS', 'BRAND_AWARENESS', 'REACH'],
    
    // Tráfego
    'LINK_CLICKS': ['OUTCOME_TRAFFIC', 'LINK_CLICKS'],
    'OUTCOME_TRAFFIC': ['OUTCOME_TRAFFIC', 'LINK_CLICKS'],
    
    // Engajamento
    'POST_ENGAGEMENT': ['OUTCOME_ENGAGEMENT', 'POST_ENGAGEMENT'],
    'PAGE_LIKES': ['OUTCOME_ENGAGEMENT', 'PAGE_LIKES'],
    'EVENT_RESPONSES': ['OUTCOME_ENGAGEMENT', 'EVENT_RESPONSES'],
    'VIDEO_VIEWS': ['OUTCOME_ENGAGEMENT', 'VIDEO_VIEWS'],
    'OUTCOME_ENGAGEMENT': ['OUTCOME_ENGAGEMENT', 'POST_ENGAGEMENT', 'PAGE_LIKES', 'VIDEO_VIEWS'],
    
    // Leads
    'LEAD_GENERATION': ['OUTCOME_LEADS', 'LEAD_GENERATION'],
    'OUTCOME_LEADS': ['OUTCOME_LEADS', 'LEAD_GENERATION'],
    
    // Conversões/Vendas
    'CONVERSIONS': ['OUTCOME_SALES', 'CONVERSIONS'],
    'CATALOG_SALES': ['OUTCOME_SALES', 'CATALOG_SALES'],
    'PRODUCT_CATALOG_SALES': ['OUTCOME_SALES', 'PRODUCT_CATALOG_SALES', 'CATALOG_SALES'],
    'OUTCOME_SALES': ['OUTCOME_SALES', 'CONVERSIONS', 'CATALOG_SALES', 'PRODUCT_CATALOG_SALES'],
    
    // App
    'APP_INSTALLS': ['OUTCOME_APP_PROMOTION', 'APP_INSTALLS'],
    'OUTCOME_APP_PROMOTION': ['OUTCOME_APP_PROMOTION', 'APP_INSTALLS'],
    
    // Mensagens
    'MESSAGES': ['OUTCOME_ENGAGEMENT', 'MESSAGES'],
  };
  
  return objectiveMap[objective] || [objective];
}

function objectiveMatchesRule(
  campaignObjective: string, 
  ruleObjectives: string[] | undefined
): boolean {
  // Sem filtro = aplica a todas
  if (!ruleObjectives || ruleObjectives.length === 0) {
    return true;
  }
  
  const normalizedCampaign = normalizeObjective(campaignObjective);
  
  // Verificar se algum objetivo da regra corresponde ao objetivo da campanha
  return ruleObjectives.some(ruleObj => {
    const normalizedRule = normalizeObjective(ruleObj);
    // Verificar interseção entre os dois conjuntos normalizados
    return normalizedCampaign.some(c => normalizedRule.includes(c)) ||
           normalizedRule.some(r => normalizedCampaign.includes(r));
  });
}

async function logProgress(
  supabase: any, 
  executionId: string, 
  companyId: string, 
  clientId: string,
  data: {
    entity_type: string;
    entity_name: string;
    status: string;
    rule_name: string;
    message: string;
    entity_id?: string;
    facebook_id?: string;
    metadata?: any;
  }
) {
  await supabase.from('automation_execution_progress').insert({
    execution_id: executionId,
    company_id: companyId,
    client_id: clientId,
    ...data
  });
}

// Fetch com retry para rate limit - configuração mais agressiva
async function fetchWithRetry(url: string, maxRetries = 8, initialDelay = 5000): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        const errorMessage = data.error.message?.toLowerCase() || '';
        const isRateLimitError = 
          data.error.code === 4 || 
          data.error.code === 17 || 
          data.error.code === 32 ||
          data.error.code === 613 ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('too many calls') ||
          errorMessage.includes('user request limit') ||
          errorMessage.includes('temporarily blocked');
        
        if (isRateLimitError && attempt < maxRetries - 1) {
          // Backoff exponencial mais agressivo: 5s, 15s, 45s, 90s, 180s...
          const delay = initialDelay * Math.pow(3, attempt);
          const cappedDelay = Math.min(delay, 180000); // Máximo 3 minutos
          console.log(`⏳ Rate limit (tentativa ${attempt + 1}/${maxRetries}), aguardando ${cappedDelay/1000}s...`);
          await new Promise(r => setTimeout(r, cappedDelay));
          continue;
        }
        throw new Error(`Facebook API Error: ${data.error.message}`);
      }

      return data;
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, attempt);
      const cappedDelay = Math.min(delay, 60000); // Máximo 1 minuto
      console.log(`⚠️ Erro de rede (tentativa ${attempt + 1}/${maxRetries}), aguardando ${cappedDelay/1000}s...`);
      await new Promise(r => setTimeout(r, cappedDelay));
    }
  }
}

// ================================================================
// FASE 1: COLETA DE ESTRUTURA
// ================================================================

async function collectFullHierarchy(
  adAccountId: string,
  accessToken: string,
  supabase: any,
  executionId: string,
  companyId: string,
  clientId: string
): Promise<CampaignData[]> {
  const hierarchy: CampaignData[] = [];

  // Buscar todas as campanhas ativas
  console.log('📡 Buscando campanhas ativas...');
  const campaigns = await fetchAllCampaigns(adAccountId, accessToken);
  console.log(`   Encontradas ${campaigns.length} campanhas`);

  await logProgress(supabase, executionId, companyId, clientId, {
    entity_type: 'system',
    entity_name: 'Campanhas',
    status: 'processing',
    rule_name: 'Coleta',
    message: `📡 Encontradas ${campaigns.length} campanhas ativas`
  });

  // Para cada campanha, buscar ad sets
  for (const campaign of campaigns) {
    console.log(`   📢 ${campaign.name} (${campaign.objective})`);
    
    const campaignData: CampaignData = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      created_time: campaign.created_time,
      adsets: []
    };

    // Delay para rate limit (aumentado para evitar bloqueio)
    await new Promise(r => setTimeout(r, 1000));

    // Buscar ad sets da campanha
    const adsets = await fetchAdSets(campaign.id, accessToken);
    console.log(`      ${adsets.length} conjuntos de anúncio`);

    for (const adset of adsets) {
      const adsetData: AdSetData = {
        id: adset.id,
        name: adset.name,
        status: adset.status,
        created_time: adset.created_time,
        ads: []
      };

      // Delay para rate limit (aumentado)
      await new Promise(r => setTimeout(r, 800));

      // Buscar ads do ad set
      const ads = await fetchAds(adset.id, accessToken);
      console.log(`         ${ads.length} criativos`);

      for (const ad of ads) {
        adsetData.ads.push({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          created_time: ad.created_time
        });
      }

      campaignData.adsets.push(adsetData);
    }

    hierarchy.push(campaignData);
  }

  return hierarchy;
}

async function fetchAllCampaigns(adAccountId: string, accessToken: string): Promise<any[]> {
  const allCampaigns: any[] = [];
  let url = `https://graph.facebook.com/v20.0/${adAccountId}/campaigns?` +
    `fields=id,name,status,objective,effective_status,created_time&` +
    `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
    `limit=100&access_token=${accessToken}`;

  while (url) {
    const data = await fetchWithRetry(url);
    if (data.data) allCampaigns.push(...data.data);
    url = data.paging?.next || null;
    if (url) await new Promise(r => setTimeout(r, 1000));
  }

  return allCampaigns;
}

async function fetchAdSets(campaignId: string, accessToken: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v20.0/${campaignId}/adsets?` +
    `fields=id,name,status,effective_status,created_time&` +
    `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
    `access_token=${accessToken}`;

  const data = await fetchWithRetry(url);
  return data.data || [];
}

async function fetchAds(adSetId: string, accessToken: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v20.0/${adSetId}/ads?` +
    `fields=id,name,status,effective_status,created_time&` +
    `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
    `access_token=${accessToken}`;

  const data = await fetchWithRetry(url);
  return data.data || [];
}

// ================================================================
// FASE 2: BUSCA DE MÉTRICAS
// ================================================================

async function fetchMetricsForHierarchy(
  hierarchy: CampaignData[],
  timeWindowDays: number,
  accessToken: string
): Promise<void> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeWindowDays);
  const sinceStr = startDate.toISOString().split('T')[0];
  const untilStr = new Date().toISOString().split('T')[0];

  for (const campaign of hierarchy) {
    // Métricas da campanha
    campaign.metrics = await fetchMetrics(campaign.id, sinceStr, untilStr, accessToken);
    await new Promise(r => setTimeout(r, 600));

    for (const adset of campaign.adsets) {
      // Métricas do ad set
      adset.metrics = await fetchMetrics(adset.id, sinceStr, untilStr, accessToken);
      await new Promise(r => setTimeout(r, 500));

      for (const ad of adset.ads) {
        // Métricas do ad
        ad.metrics = await fetchMetrics(ad.id, sinceStr, untilStr, accessToken);
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }
}

async function fetchMetrics(
  facebookId: string,
  since: string,
  until: string,
  accessToken: string
): Promise<MetricsData | undefined> {
  const url = `https://graph.facebook.com/v20.0/${facebookId}/insights?` +
    `fields=impressions,clicks,spend,actions,frequency,reach,ctr,cpc,cost_per_action_type&` +
    `time_range={"since":"${since}","until":"${until}"}&` +
    `access_token=${accessToken}`;

  try {
    const data = await fetchWithRetry(url);
    
    if (!data.data || data.data.length === 0) {
      return undefined;
    }

    const insights = data.data[0];
    const impressions = parseFloat(insights.impressions || '0');
    const clicks = parseFloat(insights.clicks || '0');
    const spend = parseFloat(insights.spend || '0');
    const reach = parseFloat(insights.reach || '0');
    const frequency = parseFloat(insights.frequency || '0');
    
    let conversions = 0;
    if (insights.actions) {
      const leadAction = insights.actions.find((a: any) => 
        a.action_type === 'offsite_conversion.fb_pixel_lead' ||
        a.action_type === 'lead' ||
        a.action_type === 'onsite_conversion.post_save'
      );
      conversions = leadAction ? parseFloat(leadAction.value) : 0;
    }

    return {
      impressions,
      clicks,
      spend,
      conversions,
      reach,
      frequency,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      // Se não há conversões, CPA = gasto total (custo efetivo para 0 leads)
      // Isso faz sentido porque se gastou R$20 e não converteu, 
      // o "custo por aquisição" é efetivamente >= R$20
      cpa: conversions > 0 ? spend / conversions : spend
    };
  } catch (error) {
    console.error(`⚠️ Error fetching metrics for ${facebookId}:`, error);
    return undefined;
  }
}

// ================================================================
// FASE 3: APLICAÇÃO DE REGRAS
// ================================================================

async function applyRuleToHierarchy(
  rule: AutomationRule,
  hierarchy: CampaignData[],
  executionId: string,
  accessToken: string,
  supabase: any,
  companyId: string,
  clientId: string,
  namePrefix: string,
  adAccountId: string
): Promise<{ actioned: number; skipped: number; ignored: number; errors: number }> {
  let actioned = 0;
  let skipped = 0;
  let ignored = 0;
  let errors = 0;

  for (const campaign of hierarchy) {
    // Verificar se o objetivo da campanha se aplica à regra (usando mapeamento)
    const objectiveMatches = objectiveMatchesRule(
      campaign.objective, 
      rule.campaign_objectives
    );

    if (!objectiveMatches) {
      // Log de campanha ignorada por objetivo
      if (rule.entity_type === 'campaign') {
        await logProgress(supabase, executionId, companyId, clientId, {
          entity_type: 'campaign',
          entity_name: campaign.name,
          status: 'skipped',
          rule_name: rule.rule_name,
          facebook_id: campaign.id,
          message: `⏭️ Objetivo ${campaign.objective} não corresponde à regra`,
          metadata: { 
            campaign_objective: campaign.objective,
            metrics: campaign.metrics
          }
        });
        ignored++;
      } else {
        // Para regras de adset/ad, marcar toda a campanha como ignorada
        console.log(`   ⏭️ Campanha ${campaign.name} ignorada (objetivo: ${campaign.objective})`);
        
        // Contar todos os ad sets e ads como ignorados
        for (const adset of campaign.adsets) {
          if (rule.entity_type === 'adset') {
            ignored++;
          } else if (rule.entity_type === 'ad') {
            ignored += adset.ads.length;
          }
        }
      }
      continue;
    }

    // Processar baseado no tipo da regra
    if (rule.entity_type === 'campaign') {
      // Verificar idade da campanha antes de processar
      if (!isEntityOldEnough(campaign.created_time, rule.time_window_days)) {
        const ageInDays = getEntityAgeInDays(campaign.created_time);
        await logProgress(supabase, executionId, companyId, clientId, {
          entity_type: 'campaign',
          entity_name: campaign.name,
          status: 'skipped',
          rule_name: rule.rule_name,
          facebook_id: campaign.id,
          message: `⏳ Campanha criada há ${ageInDays} dias - aguardando ${rule.time_window_days} dias para avaliar`,
          metadata: { 
            created_time: campaign.created_time,
            age_in_days: ageInDays,
            time_window_days: rule.time_window_days
          }
        });
        skipped++;
        continue;
      }

      const result = await processEntity(
        campaign, 
        campaign,
        rule, 
        executionId, 
        accessToken, 
        supabase, 
        companyId, 
        clientId, 
        namePrefix, 
        adAccountId
      );
      if (result === 'actioned') actioned++;
      else if (result === 'skipped') skipped++;
      else if (result === 'error') errors++;
    } else {
      // Processar ad sets
      for (const adset of campaign.adsets) {
        if (rule.entity_type === 'adset') {
          // Verificar idade do ad set antes de processar
          if (!isEntityOldEnough(adset.created_time, rule.time_window_days)) {
            const ageInDays = getEntityAgeInDays(adset.created_time);
            await logProgress(supabase, executionId, companyId, clientId, {
              entity_type: 'adset',
              entity_name: adset.name,
              status: 'skipped',
              rule_name: rule.rule_name,
              facebook_id: adset.id,
              message: `⏳ Conjunto criado há ${ageInDays} dias - aguardando ${rule.time_window_days} dias`,
              metadata: { 
                created_time: adset.created_time,
                age_in_days: ageInDays,
                time_window_days: rule.time_window_days,
                parent_campaign: campaign.name
              }
            });
            skipped++;
            continue;
          }

          const result = await processEntity(
            adset,
            campaign,
            rule,
            executionId,
            accessToken,
            supabase,
            companyId,
            clientId,
            namePrefix,
            adAccountId,
            undefined
          );
          if (result === 'actioned') actioned++;
          else if (result === 'skipped') skipped++;
          else if (result === 'error') errors++;
        } else if (rule.entity_type === 'ad') {
          // Processar ads
          for (const ad of adset.ads) {
            // Verificar idade do ad antes de processar
            if (!isEntityOldEnough(ad.created_time, rule.time_window_days)) {
              const ageInDays = getEntityAgeInDays(ad.created_time);
              await logProgress(supabase, executionId, companyId, clientId, {
                entity_type: 'ad',
                entity_name: ad.name,
                status: 'skipped',
                rule_name: rule.rule_name,
                facebook_id: ad.id,
                message: `⏳ Criativo criado há ${ageInDays} dias - aguardando ${rule.time_window_days} dias`,
                metadata: { 
                  created_time: ad.created_time,
                  age_in_days: ageInDays,
                  time_window_days: rule.time_window_days,
                  parent_campaign: campaign.name,
                  parent_adset: adset.name
                }
              });
              skipped++;
              continue;
            }

            const result = await processEntity(
              ad,
              campaign,
              rule,
              executionId,
              accessToken,
              supabase,
              companyId,
              clientId,
              namePrefix,
              adAccountId,
              adset
            );
            if (result === 'actioned') actioned++;
            else if (result === 'skipped') skipped++;
            else if (result === 'error') errors++;
          }
        }
      }
    }
  }

  return { actioned, skipped, ignored, errors };
}

async function processEntity(
  entity: CampaignData | AdSetData | AdData,
  parentCampaign: CampaignData,
  rule: AutomationRule,
  executionId: string,
  accessToken: string,
  supabase: any,
  companyId: string,
  clientId: string,
  namePrefix: string,
  adAccountId: string,
  parentAdset?: AdSetData
): Promise<'actioned' | 'skipped' | 'error'> {
  const metrics = entity.metrics;
  
  if (!metrics) {
    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: rule.entity_type,
      entity_name: entity.name,
      status: 'skipped',
      rule_name: rule.rule_name,
      facebook_id: entity.id,
      message: `⏭️ Sem métricas disponíveis`,
      metadata: {
        parent_campaign: parentCampaign.name,
        parent_adset: parentAdset?.name
      }
    });
    return 'skipped';
  }

  try {
    const conditionsMet = evaluateConditions(rule.conditions, metrics);

    if (conditionsMet) {
      console.log(`      ⚡ ${entity.name} - Condições atendidas, executando ${rule.action_type}`);
      
      const actionResult = await executeAction(
        entity.id,
        entity.name,
        rule.action_type,
        rule.action_config,
        rule.entity_type,
        rule.rule_name,
        namePrefix,
        accessToken,
        adAccountId,
        rule
      );

      if (actionResult.success) {
        await logProgress(supabase, executionId, companyId, clientId, {
          entity_type: rule.entity_type,
          entity_name: entity.name,
          status: 'actioned',
          rule_name: rule.rule_name,
          facebook_id: entity.id,
          message: `✓ ${getActionDescription(rule.action_type)} (CPA: R$ ${metrics.cpa.toFixed(2)}, Conv: ${metrics.conversions})`,
          metadata: {
            parent_campaign: parentCampaign.name,
            parent_adset: parentAdset?.name,
            metrics: metrics
          }
        });
        return 'actioned';
      } else {
        throw new Error(actionResult.error || 'Erro ao executar ação');
      }
    } else {
      await logProgress(supabase, executionId, companyId, clientId, {
        entity_type: rule.entity_type,
        entity_name: entity.name,
        status: 'skipped',
        rule_name: rule.rule_name,
        facebook_id: entity.id,
        message: `Condições não atendidas (CPA: R$ ${metrics.cpa.toFixed(2)}, CTR: ${metrics.ctr.toFixed(2)}%)`,
        metadata: {
          parent_campaign: parentCampaign.name,
          parent_adset: parentAdset?.name,
          metrics: metrics
        }
      });
      return 'skipped';
    }
  } catch (error: any) {
    console.error(`❌ Error processing ${entity.name}:`, error);
    
    await logProgress(supabase, executionId, companyId, clientId, {
      entity_type: rule.entity_type,
      entity_name: entity.name,
      status: 'error',
      rule_name: rule.rule_name,
      facebook_id: entity.id,
      message: `Erro: ${error.message}`,
      metadata: {
        parent_campaign: parentCampaign.name,
        parent_adset: parentAdset?.name
      }
    });
    return 'error';
  }
}

function evaluateConditions(conditions: any, metrics: MetricsData): boolean {
  if (!conditions || !conditions.conditions) return false;

  const logic = conditions.logic || 'AND';
  const conditionsList = conditions.conditions;

  const results = conditionsList.map((cond: any) => {
    const metricValue = (metrics as any)[cond.field];
    const targetValue = parseFloat(cond.value);

    switch (cond.operator) {
      case '>': return metricValue > targetValue;
      case '>=': return metricValue >= targetValue;
      case '<': return metricValue < targetValue;
      case '<=': return metricValue <= targetValue;
      case '=': return Math.abs(metricValue - targetValue) < 0.01;
      case '!=': return Math.abs(metricValue - targetValue) >= 0.01;
      default: return false;
    }
  });

  return logic === 'AND' ? results.every((r: boolean) => r) : results.some((r: boolean) => r);
}

// Verificar se entidade é antiga o suficiente para ser avaliada
function isEntityOldEnough(createdTime: string | undefined, timeWindowDays: number): boolean {
  if (!createdTime) {
    // Se não temos a data de criação, assumimos que é antiga o suficiente
    return true;
  }
  
  const createdDate = new Date(createdTime);
  const now = new Date();
  const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return ageInDays >= timeWindowDays;
}

function getEntityAgeInDays(createdTime: string | undefined): number {
  if (!createdTime) return 999;
  const createdDate = new Date(createdTime);
  const now = new Date();
  return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

function getActionDescription(actionType: string): string {
  const descriptions: Record<string, string> = {
    'pause': 'Pausado',
    'pause_campaign': 'Campanha pausada',
    'pause_adset': 'Conjunto pausado',
    'pause_ad': 'Criativo pausado',
    'activate': 'Ativado',
    'activate_campaign': 'Campanha ativada',
    'activate_adset': 'Conjunto ativado',
    'activate_ad': 'Criativo ativado',
    'increase_budget': 'Budget aumentado',
    'decrease_budget': 'Budget reduzido',
    'duplicate_campaign': 'Campanha duplicada',
    'duplicate_adset': 'Conjunto duplicado',
    'duplicate_ad': 'Criativo duplicado',
  };
  return descriptions[actionType] || actionType;
}

function generateEntityName(
  currentName: string,
  namePrefix: string,
  actionType: string,
  ruleName: string,
  budgetChange?: number
): string {
  const cleanName = currentName
    .replace(new RegExp(`^\\[${namePrefix}\\]\\s*`, 'i'), '')
    .replace(/\s*-\s*(Pausad[oa]|Ativad[oa]|Budget\s+[\w\s%+-]+).*$/i, '');
  
  let suffix = '';
  switch (actionType) {
    case 'pause':
    case 'pause_campaign':
    case 'pause_adset':
    case 'pause_ad':
      suffix = `Pausado (${ruleName})`;
      break;
    case 'activate':
    case 'activate_campaign':
    case 'activate_adset':
    case 'activate_ad':
      suffix = `Ativado (${ruleName})`;
      break;
    case 'increase_budget':
      suffix = `Budget +${budgetChange}% (${ruleName})`;
      break;
    case 'decrease_budget':
      suffix = `Budget -${budgetChange}% (${ruleName})`;
      break;
    case 'duplicate_campaign':
    case 'duplicate_adset':
    case 'duplicate_ad':
      suffix = `Cópia (${ruleName})`;
      break;
    default:
      suffix = ruleName;
  }
  
  return `[${namePrefix}] ${cleanName} - ${suffix}`;
}

async function executeAction(
  facebookId: string,
  currentName: string,
  actionType: string,
  actionConfig: any,
  entityType: string,
  ruleName: string,
  namePrefix: string,
  accessToken: string,
  adAccountId: string,
  rule?: AutomationRule
): Promise<{ success: boolean; error?: string }> {
  try {
    let url = '';
    let body: any = {};

    switch (actionType) {
      case 'pause':
      case 'pause_campaign':
      case 'pause_adset':
      case 'pause_ad':
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        body = { 
          status: 'PAUSED',
          name: generateEntityName(currentName, namePrefix, actionType, ruleName)
        };
        break;
      
      case 'activate':
      case 'activate_campaign':
      case 'activate_adset':
      case 'activate_ad':
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        body = { 
          status: 'ACTIVE',
          name: generateEntityName(currentName, namePrefix, actionType, ruleName)
        };
        break;
      
      case 'adjust_budget':
      case 'increase_budget':
      case 'decrease_budget':
        if (entityType !== 'campaign' && entityType !== 'adset') {
          return { success: false, error: 'Ajuste de budget só disponível para campanhas e conjuntos' };
        }
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        
        const currentResponse = await fetch(
          `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
        );
        const currentData = await currentResponse.json();
        const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
        
        let percentChange = 0;
        let newBudget = currentBudget;
        
        if (actionType === 'increase_budget') {
          percentChange = actionConfig?.increase_percentage || 
                          rule?.budget_safety_limits?.max_daily_budget_increase_percent || 0;
          if (percentChange > 0) {
            newBudget = currentBudget * (1 + percentChange / 100);
          }
        } else if (actionType === 'decrease_budget') {
          percentChange = actionConfig?.decrease_percentage || 
                          rule?.budget_safety_limits?.max_daily_budget_decrease_percent || 0;
          if (percentChange > 0) {
            newBudget = currentBudget * (1 - percentChange / 100);
          }
        }
        
        body = {
          daily_budget: Math.round(newBudget),
          name: generateEntityName(currentName, namePrefix, actionType, ruleName, percentChange)
        };
        break;
      
      case 'duplicate_campaign':
      case 'duplicate_adset':
        url = `https://graph.facebook.com/v20.0/${facebookId}/copies`;
        body = {
          name: generateEntityName(currentName, namePrefix, actionType, ruleName),
          status: 'ACTIVE'
        };
        break;
      
      case 'duplicate_ad':
        const adDataResponse = await fetch(
          `https://graph.facebook.com/v20.0/${facebookId}?fields=name,adset_id,creative&access_token=${accessToken}`
        );
        const adData = await adDataResponse.json();
        
        url = `https://graph.facebook.com/v20.0/${adAccountId}/ads`;
        body = {
          name: generateEntityName(currentName, namePrefix, actionType, ruleName),
          adset_id: adData.adset_id,
          creative: { creative_id: adData.creative.id },
          status: 'ACTIVE'
        };
        break;
      
      default:
        return { success: false, error: `Tipo de ação não implementado: ${actionType}` };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: accessToken })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    // Se for duplicação, garantir ativação
    if (['duplicate_campaign', 'duplicate_adset', 'duplicate_ad'].includes(actionType) && data.id) {
      await fetch(`https://graph.facebook.com/v20.0/${data.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', access_token: accessToken })
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
