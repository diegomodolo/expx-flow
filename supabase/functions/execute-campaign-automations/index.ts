import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRule {
  id: string;
  company_id: string;
  client_id: string | null;
  rule_name: string;
  campaign_objectives: string[] | null;
  time_window_days: number;
  conditions: {
    logic: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      operator: '<' | '>' | '=' | '!=' | '>=' | '<=';
      value: number | boolean;
      type: 'number' | 'boolean';
    }>;
  };
  action_type: string;
  action_config: any;
  budget_safety_limits: any;
  execution_limits: any;
  scope_filters: any;
}

// ============ VALIDAÇÃO E FILTROS ============

function validateCampaignDataIntegrity(campaign: any): boolean {
  const now = new Date();
  const updatedAt = new Date(campaign.updated_at);
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 48) {
    console.log(`⚠️ Campaign data too old: ${campaign.name} (${hoursSinceUpdate.toFixed(1)}h)`);
    return false;
  }
  
  if (campaign.spend === null || campaign.cpa === null) {
    console.log(`⚠️ Missing critical metrics: ${campaign.name}`);
    return false;
  }
  
  return true;
}

function matchesScopeFilters(campaign: any, filters: any): boolean {
  if (filters.include_campaign_names?.length > 0) {
    const matches = filters.include_campaign_names.some((pattern: string) => 
      campaign.name.toLowerCase().includes(pattern.toLowerCase())
    );
    if (!matches) return false;
  }
  
  if (filters.exclude_campaign_names?.length > 0) {
    const matches = filters.exclude_campaign_names.some((pattern: string) => 
      campaign.name.toLowerCase().includes(pattern.toLowerCase())
    );
    if (matches) return false;
  }
  
  if (filters.only_objectives?.length > 0 && campaign.objective) {
    if (!filters.only_objectives.includes(campaign.objective)) {
      return false;
    }
  }
  
  return true;
}

async function checkExecutionLimits(
  supabase: any,
  rule: AutomationRule,
  campaign: any
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = rule.execution_limits;
  
  // Verificar máximo de execuções por dia
  if (limits.max_executions_per_campaign_per_day) {
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    
    const { data: recentLogs } = await supabase
      .from('campaign_automation_logs')
      .select('*')
      .eq('rule_id', rule.id)
      .eq('campaign_id', campaign.id)
      .eq('action_result', 'success')
      .gte('executed_at', dayAgo.toISOString());
    
    if (recentLogs && recentLogs.length >= limits.max_executions_per_campaign_per_day) {
      return { 
        allowed: false, 
        reason: `Max executions per day reached (${recentLogs.length})` 
      };
    }
  }
  
  // Verificar flip-flop
  if (limits.prevent_flip_flop) {
    const cooldownHours = limits.flip_flop_cooldown_hours || 12;
    const cooldownStart = new Date();
    cooldownStart.setHours(cooldownStart.getHours() - cooldownHours);
    
    const oppositeActions: Record<string, string> = {
      'pause_campaign': 'activate_campaign',
      'activate_campaign': 'pause_campaign',
      'increase_budget': 'decrease_budget',
      'decrease_budget': 'increase_budget',
    };
    
    const oppositeAction = oppositeActions[rule.action_type];
    if (oppositeAction) {
      const { data: flipFlopLogs } = await supabase
        .from('campaign_automation_logs')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('action_type', oppositeAction)
        .eq('action_result', 'success')
        .gte('executed_at', cooldownStart.toISOString());
      
      if (flipFlopLogs && flipFlopLogs.length > 0) {
        return { 
          allowed: false, 
          reason: `Flip-flop prevented (opposite action ${oppositeAction} done recently)` 
        };
      }
    }
  }
  
  return { allowed: true };
}

// ============ ANÁLISE E DECISÃO ============

async function evaluateConditionsWithTimeWindow(
  supabase: any,
  campaign: any,
  rule: AutomationRule
): Promise<{ met: boolean; description: string }> {
  const windowDays = rule.time_window_days || 1;
  
  // Se janela > 1 dia, buscar métricas históricas
  let metrics = campaign;
  
  if (windowDays > 1) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);
    
    const { data: snapshots } = await supabase
      .from('performance_snapshots')
      .select('*')
      .eq('entity_type', 'campaign')
      .eq('entity_id', campaign.id)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false });
    
    if (snapshots && snapshots.length > 0) {
      // Calcular médias
      metrics = {
        ...campaign,
        cpa: snapshots.reduce((sum: number, s: any) => sum + (s.cpa || 0), 0) / snapshots.length,
        ctr: snapshots.reduce((sum: number, s: any) => sum + (s.ctr || 0), 0) / snapshots.length,
        frequency: snapshots.reduce((sum: number, s: any) => sum + (s.frequency || 0), 0) / snapshots.length,
        conversions: snapshots.reduce((sum: number, s: any) => sum + (s.conversions || 0), 0),
      };
    }
  }
  
  // Avaliar condições
  const results = rule.conditions.conditions.map(cond => {
    const value = metrics[cond.field];
    
    switch (cond.operator) {
      case '>': return value > cond.value;
      case '<': return value < cond.value;
      case '>=': return value >= cond.value;
      case '<=': return value <= cond.value;
      case '=': return value === cond.value;
      case '!=': return value !== cond.value;
      default: return false;
    }
  });
  
  const met = rule.conditions.logic === 'AND' 
    ? results.every(r => r)
    : results.some(r => r);
  
  // Gerar descrição
  const descriptions: string[] = [];
  rule.conditions.conditions.forEach((cond, i) => {
    if (results[i]) {
      const value = metrics[cond.field];
      if (cond.field === 'cpa') descriptions.push(`CPA: R$${value?.toFixed(2)}`);
      else if (cond.field === 'ctr') descriptions.push(`CTR: ${value?.toFixed(2)}%`);
      else if (cond.field === 'frequency') descriptions.push(`Freq: ${value?.toFixed(1)}x`);
      else if (cond.field === 'conversions') descriptions.push(`Conv: ${value}`);
    }
  });
  
  return { 
    met, 
    description: descriptions.join(', ') || 'Condições atendidas' 
  };
}

function detectCreativeFatigue(campaign: any, actionConfig: any): boolean {
  if (!actionConfig.check_creative_fatigue) return false;
  
  const frequencyThreshold = actionConfig.frequency_threshold || 4;
  const ctrThreshold = actionConfig.ctr_threshold || 1.0;
  
  return campaign.frequency > frequencyThreshold && campaign.ctr < ctrThreshold;
}

// ============ AÇÕES ============

function buildNewName(
  originalName: string,
  actionType: string,
  conditionsDescription: string,
  prefix: string = 'SHEGrowth'
): string {
  // Remove qualquer prefixo existente (padrão genérico entre colchetes)
  let baseName = originalName.replace(/^\[.*?\]\s*/i, '').trim();
  
  // Remove sufixos antigos depois de " - "
  const dashIndex = baseName.indexOf(' - ');
  if (dashIndex > 0) {
    baseName = baseName.substring(0, dashIndex).trim();
  }
  
  let suffix = '';
  switch (actionType) {
    case 'pause_campaign':
    case 'pause_adset':
    case 'pause_ad':
      suffix = `Pausada (${conditionsDescription})`;
      break;
    case 'activate_campaign':
    case 'activate_adset':
    case 'activate_ad':
      suffix = `Ativada (${conditionsDescription})`;
      break;
    case 'increase_budget':
    case 'increase_adset_budget':
      suffix = `Budget Aumentado`;
      break;
    case 'decrease_budget':
    case 'decrease_adset_budget':
      suffix = `Budget Reduzido`;
      break;
    case 'duplicate_campaign':
    case 'duplicate_adset':
    case 'duplicate_ad':
      suffix = `Cópia Auto (${conditionsDescription})`;
      break;
    default:
      suffix = conditionsDescription;
  }
  
  return `[${prefix}] ${baseName} - ${suffix}`;
}

async function pauseCampaignSafely(
  campaign: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  // Validar que facebook_id existe
  if (!campaign.facebook_id) {
    throw new Error(`Campaign ${campaign.name} (ID: ${campaign.id}) is missing facebook_id. Please resync campaigns.`);
  }

  // Validar objetivo
  if (rule.campaign_objectives && campaign.objective) {
    if (!rule.campaign_objectives.includes(campaign.objective)) {
      throw new Error(`Campaign objective ${campaign.objective} not allowed for this rule`);
    }
  }
  
  const newName = buildNewName(campaign.name, 'pause_campaign', conditionsDesc, prefix);
  
  const url = `https://graph.facebook.com/v20.0/${campaign.facebook_id}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'PAUSED',
      name: newName,
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  return { 
    oldName: campaign.name,
    newName,
    oldStatus: campaign.status,
    newStatus: 'PAUSED',
    result: await response.json() 
  };
}

async function activateCampaignSafely(
  campaign: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  // Validar que facebook_id existe
  if (!campaign.facebook_id) {
    throw new Error(`Campaign ${campaign.name} (ID: ${campaign.id}) is missing facebook_id. Please resync campaigns.`);
  }

  if (rule.campaign_objectives && campaign.objective) {
    if (!rule.campaign_objectives.includes(campaign.objective)) {
      throw new Error(`Campaign objective ${campaign.objective} not allowed for this rule`);
    }
  }
  
  const newName = buildNewName(campaign.name, 'activate_campaign', conditionsDesc, prefix);
  
  const url = `https://graph.facebook.com/v20.0/${campaign.facebook_id}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ACTIVE',
      name: newName,
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  return { 
    oldName: campaign.name,
    newName,
    oldStatus: campaign.status,
    newStatus: 'ACTIVE',
    result: await response.json() 
  };
}

async function adjustBudgetSafely(
  supabase: any,
  campaign: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  // Validar que facebook_id existe
  if (!campaign.facebook_id) {
    throw new Error(`Campaign ${campaign.name} (ID: ${campaign.id}) is missing facebook_id. Please resync campaigns.`);
  }

  const limits = rule.budget_safety_limits;
  const percentChange = rule.action_type === 'increase_budget' 
    ? (rule.action_config.budget_change_percent || 20)
    : -(rule.action_config.budget_change_percent || 20);
  
  // Buscar budget atual da API
  const getUrl = `https://graph.facebook.com/v20.0/${campaign.facebook_id}?fields=daily_budget&access_token=${integration.access_token}`;
  const getResponse = await fetch(getUrl);
  const currentData = await getResponse.json();
  
  const currentBudget = parseFloat(currentData.daily_budget || '0') / 100;
  let newBudget = currentBudget * (1 + percentChange / 100);
  
  // Aplicar limites de segurança
  const maxIncrease = currentBudget * (1 + (limits.max_increase_percent || 50) / 100);
  const maxDecrease = currentBudget * (1 - (limits.max_decrease_percent || 50) / 100);
  
  if (percentChange > 0) {
    newBudget = Math.min(newBudget, maxIncrease);
  } else {
    newBudget = Math.max(newBudget, maxDecrease);
  }
  
  newBudget = Math.max(newBudget, limits.min_daily_budget || 10);
  newBudget = Math.min(newBudget, limits.max_daily_budget || 10000);
  
  // Verificar cooldown
  if (limits.cooldown_hours) {
    const cooldownStart = new Date();
    cooldownStart.setHours(cooldownStart.getHours() - limits.cooldown_hours);
    
    const { data: recentBudgetChanges } = await supabase
      .from('campaign_automation_logs')
      .select('*')
      .eq('campaign_id', campaign.id)
      .in('action_type', ['increase_budget', 'decrease_budget'])
      .eq('action_result', 'success')
      .gte('executed_at', cooldownStart.toISOString());
    
    if (recentBudgetChanges && recentBudgetChanges.length > 0) {
      throw new Error(`Budget cooldown active (${limits.cooldown_hours}h)`);
    }
  }
  
  const newName = buildNewName(
    campaign.name, 
    rule.action_type,
    `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`,
    prefix
  );
  
  // Atualizar budget
  const updateUrl = `https://graph.facebook.com/v20.0/${campaign.facebook_id}`;
  const updateResponse = await fetch(updateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      daily_budget: Math.round(newBudget * 100),
      name: newName,
      access_token: integration.access_token,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(`Facebook API error: ${await updateResponse.text()}`);
  }

  return { 
    oldName: campaign.name,
    newName,
    oldBudget: currentBudget, 
    newBudget,
    result: await updateResponse.json() 
  };
}

async function duplicateCampaignSafely(
  campaign: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  // Validar facebook_id
  if (!campaign.facebook_id) {
    throw new Error(`Campaign ${campaign.name} is missing facebook_id`);
  }

  // Validar objetivo
  if (rule.campaign_objectives && campaign.objective) {
    if (!rule.campaign_objectives.includes(campaign.objective)) {
      throw new Error(`Campaign objective ${campaign.objective} not allowed`);
    }
  }

  // Buscar dados completos da campanha via API do Facebook
  const getCampaignUrl = `https://graph.facebook.com/v20.0/${campaign.facebook_id}?fields=name,objective,status,daily_budget,bid_strategy,special_ad_categories&access_token=${integration.access_token}`;
  const getCampaignResponse = await fetch(getCampaignUrl);
  
  if (!getCampaignResponse.ok) {
    throw new Error(`Failed to fetch campaign data: ${await getCampaignResponse.text()}`);
  }
  
  const campaignData = await getCampaignResponse.json();

  // Calcular novo budget baseado na porcentagem configurada
  const budgetPercent = rule.action_config?.duplicate_budget_percent || 50;
  const originalBudget = parseFloat(campaignData.daily_budget || '0');
  const newBudget = Math.round(originalBudget * (budgetPercent / 100));
  
  console.log(`💰 Budget adjustment: ${originalBudget / 100} → ${newBudget / 100} (${budgetPercent}%)`);

  // Criar nome para a cópia
  const newName = buildNewName(
    campaign.name, 
    'duplicate_campaign',
    conditionsDesc,
    prefix
  );

  // Duplicar campanha via API do Facebook
  const adAccountId = campaign.clients?.ad_account_id;
  if (!adAccountId) {
    throw new Error('Ad account ID not found');
  }

  const duplicateUrl = `https://graph.facebook.com/v20.0/${adAccountId}/campaigns`;
  const duplicateResponse = await fetch(duplicateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      objective: campaignData.objective,
      status: 'ACTIVE',
      daily_budget: newBudget,
      bid_strategy: campaignData.bid_strategy,
      special_ad_categories: campaignData.special_ad_categories,
      access_token: integration.access_token,
    }),
  });

  if (!duplicateResponse.ok) {
    throw new Error(`Facebook API error: ${await duplicateResponse.text()}`);
  }

  const duplicateResult = await duplicateResponse.json();
  const newCampaignId = duplicateResult.id;

  console.log(`✅ Campaign duplicated: ${newName} (${newCampaignId}) - Status: ACTIVE`);

  // Copiar ad sets da campanha original
  const getAdSetsUrl = `https://graph.facebook.com/v20.0/${campaign.facebook_id}/adsets?fields=id&access_token=${integration.access_token}`;
  const adSetsResponse = await fetch(getAdSetsUrl);
  const adSetsData = await adSetsResponse.json();

  if (adSetsData.data && adSetsData.data.length > 0) {
    for (const adSet of adSetsData.data) {
      // Copiar cada ad set para a nova campanha
      const copyAdSetUrl = `https://graph.facebook.com/v20.0/${adSet.id}/copies`;
      const copyResponse = await fetch(copyAdSetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: newCampaignId,
          status_option: 'ACTIVE',
          deep_copy: true,
          access_token: integration.access_token,
        }),
      });
      
      if (copyResponse.ok) {
        console.log(`✅ Ad set ${adSet.id} copied with status ACTIVE`);
      }
    }
  }

  return {
    oldName: campaign.name,
    newName,
    originalCampaignId: campaign.facebook_id,
    duplicatedCampaignId: newCampaignId,
    oldBudget: originalBudget / 100,
    newBudget: newBudget / 100,
    budgetPercent,
    newStatus: 'ACTIVE',
    result: duplicateResult,
  };
}

async function createRecommendation(
  supabase: any,
  rule: AutomationRule,
  campaign: any,
  conditionsDesc: string
) {
  await supabase.from('campaign_automation_recommendations').insert({
    rule_id: rule.id,
    company_id: rule.company_id,
    client_id: campaign.client_id,
    campaign_id: campaign.id,
    recommended_action: rule.action_type,
    action_config: rule.action_config,
    reason: conditionsDesc,
    conditions_met: rule.conditions,
    campaign_data: campaign,
    status: 'pending',
  });
  
  return { recommended: true };
}

// ============ FUNÇÕES PARA AD SETS ============

async function fetchAdSets(supabase: any, companyId: string, clientId?: string) {
  let query = supabase
    .from('ad_sets')
    .select(`
      *,
      campaigns!inner(id, name, client_id, objective),
      clients!inner(id, name, ad_account_id)
    `)
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching ad sets:', error);
    return [];
  }

  return data || [];
}

async function pauseAdSetSafely(
  adSet: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  if (!adSet.facebook_id) {
    throw new Error(`Ad Set ${adSet.name} is missing facebook_id`);
  }

  const newName = buildNewName(adSet.name, 'pause_adset', conditionsDesc, prefix);
  
  const url = `https://graph.facebook.com/v20.0/${adSet.facebook_id}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      status: 'PAUSED',
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  return {
    oldName: adSet.name,
    newName,
    oldStatus: adSet.status,
    newStatus: 'PAUSED',
  };
}

async function duplicateAdSetSafely(
  adSet: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  if (!adSet.facebook_id) {
    throw new Error(`Ad Set ${adSet.name} is missing facebook_id`);
  }

  const budgetPercent = rule.action_config?.duplicate_budget_percent || 50;
  const newName = buildNewName(adSet.name, 'duplicate_adset', conditionsDesc, prefix);

  const copyUrl = `https://graph.facebook.com/v20.0/${adSet.facebook_id}/copies`;
  const response = await fetch(copyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      status_option: 'ACTIVE',
      deep_copy: true,
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  const result = await response.json();

  if (budgetPercent !== 100 && adSet.daily_budget) {
    const newBudget = Math.round(parseFloat(adSet.daily_budget) * (budgetPercent / 100) * 100);
    await fetch(`https://graph.facebook.com/v20.0/${result.copied_adset_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_budget: newBudget,
        access_token: integration.access_token,
      }),
    });
  }

  return {
    oldName: adSet.name,
    newName,
    originalAdSetId: adSet.facebook_id,
    duplicatedAdSetId: result.copied_adset_id,
    budgetPercent,
  };
}

// ============ FUNÇÕES PARA ADS ============

async function fetchAds(supabase: any, companyId: string, clientId?: string) {
  try {
    // 1. Buscar campaigns da empresa/cliente
    let campaignsQuery = supabase
      .from('campaigns')
      .select('id, name, objective, status, company_id, client_id')
      .eq('company_id', companyId)
      .eq('status', 'ACTIVE');

    if (clientId) {
      campaignsQuery = campaignsQuery.eq('client_id', clientId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;
    if (campaignsError) {
      console.error('Error fetching campaigns for ads:', campaignsError);
      return [];
    }
    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns found for ads');
      return [];
    }

    const campaignIds = campaigns.map(c => c.id);
    const campaignsMap = new Map(campaigns.map(c => [c.id, c]));

    // 2. Buscar ad_sets dessas campaigns
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select('id, name, campaign_id, status, daily_budget, targeting')
      .in('campaign_id', campaignIds)
      .eq('status', 'ACTIVE');

    if (adSetsError) {
      console.error('Error fetching ad_sets for ads:', adSetsError);
      return [];
    }
    if (!adSets || adSets.length === 0) {
      console.log('No ad_sets found for ads');
      return [];
    }

    const adSetIds = adSets.map(a => a.id);
    const adSetsMap = new Map(adSets.map(a => [a.id, a]));

    // 3. Buscar ads ativos desses ad_sets
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .in('ad_set_id', adSetIds)
      .eq('is_active', true);

    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return [];
    }
    if (!ads || ads.length === 0) {
      console.log('No active ads found');
      return [];
    }

    // 4. Buscar clients para enriquecer os dados
    const clientIds = [...new Set(campaigns.map(c => c.client_id).filter(Boolean))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, ad_account_id')
      .in('id', clientIds);

    const clientsMap = new Map((clients || []).map(c => [c.id, c]));

    // 5. Combinar dados manualmente (replicando estrutura de join)
    const enrichedAds = ads.map(ad => {
      const adSet = adSetsMap.get(ad.ad_set_id);
      const campaign = adSet ? campaignsMap.get(adSet.campaign_id) : null;
      const client = campaign ? clientsMap.get(campaign.client_id) : null;

      return {
        ...ad,
        ad_sets: adSet ? {
          id: adSet.id,
          name: adSet.name,
          campaign_id: adSet.campaign_id,
        } : null,
        campaigns: campaign ? {
          id: campaign.id,
          name: campaign.name,
          client_id: campaign.client_id,
          objective: campaign.objective,
        } : null,
        clients: client ? {
          id: client.id,
          name: client.name,
          ad_account_id: client.ad_account_id,
        } : null,
      };
    });

    console.log(`✅ Fetched ${enrichedAds.length} ads with manual joins (from ${adSets.length} ad sets, ${campaigns.length} campaigns)`);
    return enrichedAds;

  } catch (error) {
    console.error('Unexpected error in fetchAds:', error);
    return [];
  }
}

async function pauseAdSafely(
  ad: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  if (!ad.facebook_id) {
    throw new Error(`Ad ${ad.name} is missing facebook_id`);
  }

  const newName = buildNewName(ad.name, 'pause_ad', conditionsDesc, prefix);
  
  const url = `https://graph.facebook.com/v20.0/${ad.facebook_id}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      status: 'PAUSED',
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  return {
    oldName: ad.name,
    newName,
    oldStatus: ad.status,
    newStatus: 'PAUSED',
  };
}

async function duplicateAdSafely(
  ad: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string,
  prefix: string = 'SHEGrowth'
) {
  if (!ad.facebook_id) {
    throw new Error(`Ad ${ad.name} is missing facebook_id`);
  }

  const newName = buildNewName(ad.name, 'duplicate_ad', conditionsDesc, prefix);

  const copyUrl = `https://graph.facebook.com/v20.0/${ad.facebook_id}/copies`;
  const response = await fetch(copyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      status_option: 'ACTIVE',
      access_token: integration.access_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${await response.text()}`);
  }

  const result = await response.json();

  return {
    oldName: ad.name,
    newName,
    originalAdId: ad.facebook_id,
    duplicatedAdId: result.copied_ad_id,
  };
}

// ============ SERVIDOR PRINCIPAL ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    const ruleId = url.searchParams.get('rule_id');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (client_id) {
      console.log(`🤖 [SHEGrowth] Starting campaign automation for client: ${client_id}...`);
    } else {
      console.log('🤖 [SHEGrowth] Starting campaign automation...');
    }

    // Buscar regras ativas
    let rulesQuery = supabase
      .from('campaign_automation_rules')
      .select('*')
      .eq('is_active', true)
      .eq('is_template', false);
    
    if (ruleId) {
      rulesQuery = rulesQuery.eq('id', ruleId);
    }
    
    if (client_id) {
      rulesQuery = rulesQuery.eq('client_id', client_id);
    }
    
    const { data: rules, error: rulesError } = await rulesQuery
      .order('rule_order', { ascending: true });

    if (rulesError) throw rulesError;

    console.log(`📋 Found ${rules.length} active rules`);

    // Buscar configurações de automação por empresa (para o prefixo)
    const companySettings = new Map<string, string>();
    const uniqueCompanyIds = [...new Set(rules.map(r => r.company_id))];
    
    for (const companyId of uniqueCompanyIds) {
      const { data: settings } = await supabase
        .from('automation_settings')
        .select('campaign_name_prefix')
        .eq('company_id', companyId)
        .single();
      
      const prefix = settings?.campaign_name_prefix || 'SHEGrowth';
      companySettings.set(companyId, prefix);
      console.log(`⚙️ Company ${companyId} using prefix: [${prefix}]`);
    }

    let totalAnalyzed = 0;
    let totalActioned = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    const simulationResults: any[] = [];

    // Agrupar regras por entity_type
    const campaignRules = rules.filter(r => !r.entity_type || r.entity_type === 'campaign');
    const adsetRules = rules.filter(r => r.entity_type === 'adset');
    const adRules = rules.filter(r => r.entity_type === 'ad');

    console.log(`📊 Rules: ${campaignRules.length} campaigns, ${adsetRules.length} ad sets, ${adRules.length} ads`);

    // Validar compatibilidade entity_type x action_type
    for (const rule of rules) {
      const isAdAction = ['pause_ad', 'activate_ad', 'duplicate_ad'].includes(rule.action_type);
      const isAdsetAction = ['pause_adset', 'activate_adset', 'duplicate_adset'].includes(rule.action_type);
      const isCampaignAction = ['pause_campaign', 'activate_campaign', 'adjust_budget', 'duplicate_campaign'].includes(rule.action_type);
      
      if (isAdAction && rule.entity_type !== 'ad') {
        console.warn(`⚠️ Rule ${rule.rule_name}: action_type=${rule.action_type} but entity_type=${rule.entity_type}`);
      }
      if (isAdsetAction && rule.entity_type !== 'adset') {
        console.warn(`⚠️ Rule ${rule.rule_name}: action_type=${rule.action_type} but entity_type=${rule.entity_type}`);
      }
      if (isCampaignAction && (!rule.entity_type || rule.entity_type === 'campaign')) {
        // OK - campaign actions on campaign entities
      } else if (isCampaignAction && rule.entity_type !== 'campaign') {
        console.warn(`⚠️ Rule ${rule.rule_name}: action_type=${rule.action_type} but entity_type=${rule.entity_type}`);
      }
    }

    // ========== PROCESSAR CAMPANHAS ==========
    for (const rule of campaignRules) {
      try {
        let campaignQuery = supabase
          .from('campaigns')
          .select('*, clients!inner(*)')
          .eq('company_id', rule.company_id)
          .eq('is_active', true);

        if (rule.client_id) {
          campaignQuery = campaignQuery.eq('client_id', rule.client_id);
        }

        if (rule.campaign_objectives && rule.campaign_objectives.length > 0) {
          campaignQuery = campaignQuery.in('objective', rule.campaign_objectives);
        }

        const { data: campaigns } = await campaignQuery;

        const { data: integration } = await supabase
          .from('facebook_integrations')
          .select('*')
          .eq('company_id', rule.company_id)
          .eq('is_active', true)
          .single();

        if (!integration) {
          console.log(`⚠️ No Facebook integration`);
          continue;
        }

        for (const campaign of campaigns || []) {
          totalAnalyzed++;

          if (!validateCampaignDataIntegrity(campaign)) continue;
          if (!matchesScopeFilters(campaign, rule.scope_filters)) continue;

          // 🆕 Verificação explícita de objetivo da regra
          if (rule.campaign_objectives?.length > 0 && campaign.objective) {
            if (!rule.campaign_objectives.includes(campaign.objective)) {
              console.log(`⏭️ Campaign ${campaign.name}: Objective ${campaign.objective} not in rule targets`);
              continue; // Não registra log, apenas pula
            }
          }

          const limitCheck = await checkExecutionLimits(supabase, rule, campaign);
          if (!limitCheck.allowed) {
            console.log(`⏭️ ${campaign.name}: ${limitCheck.reason}`);
            continue;
          }

          const evaluation = await evaluateConditionsWithTimeWindow(supabase, campaign, rule);
          
          if (evaluation.met) {
            console.log(`✅ Campaign ${campaign.name}: ${evaluation.description}`);

            if (mode === 'simulation') {
              simulationResults.push({
                entity_type: 'campaign',
                entity_name: campaign.name,
                rule_name: rule.rule_name,
                action: rule.action_type,
                reason: evaluation.description,
              });
              continue;
            }

            try {
              let result;
              const prefix = companySettings.get(rule.company_id) || 'SHEGrowth';
              
              if (rule.action_type === 'notify_only') {
                result = await createRecommendation(supabase, rule, campaign, evaluation.description);
              } else if (rule.action_type === 'pause_campaign') {
                result = await pauseCampaignSafely(campaign, integration, rule, evaluation.description, prefix);
              } else if (rule.action_type === 'activate_campaign') {
                result = await activateCampaignSafely(campaign, integration, rule, evaluation.description, prefix);
              } else if (['increase_budget', 'decrease_budget'].includes(rule.action_type)) {
                result = await adjustBudgetSafely(supabase, campaign, integration, rule, evaluation.description, prefix);
              } else if (rule.action_type === 'duplicate_campaign') {
                result = await duplicateCampaignSafely(campaign, integration, rule, evaluation.description, prefix);
                console.log(`🚀 Campanha duplicada: ${result.newName}`);
              }

              const logData: any = {
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: campaign.client_id,
                campaign_id: campaign.id,
                entity_type: 'campaign',
                action_type: rule.action_type,
                action_result: 'success',
                old_name: result.oldName,
                new_name: result.newName,
                old_budget: result.oldBudget,
                new_budget: result.newBudget,
                old_status: result.oldStatus,
                new_status: result.newStatus,
                metadata: { campaign, result },
              };

              // Recovery trigger configuration
              if (rule.action_config?.enable_recovery_trigger && 
                  ['pause_campaign', 'pause_adset', 'pause_ad'].includes(rule.action_type)) {
                const recoveryDays = rule.action_config.recovery_trigger_days || 3;
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + recoveryDays);
                
                logData.recovery_trigger_enabled = true;
                logData.recovery_trigger_days = recoveryDays;
                logData.recovery_scheduled_for = scheduledDate.toISOString();
                
                console.log(`🔄 Recovery scheduled for ${scheduledDate.toISOString()} (${recoveryDays} days)`);
              }

              await supabase.from('campaign_automation_logs').insert(logData);

              totalActioned++;
            } catch (actionError: any) {
              console.error(`❌ Error:`, actionError);
              await supabase.from('campaign_automation_logs').insert({
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: campaign.client_id,
                campaign_id: campaign.id,
                entity_type: 'campaign',
                action_type: rule.action_type,
                action_result: 'error',
                error_message: actionError.message,
              });
              totalErrors++;
            }
          } else {
            // 🆕 Registrar verificação sem ação
            console.log(`⏭️ Campaign ${campaign.name}: Conditions not met (${evaluation.description})`);
            await supabase.from('campaign_automation_logs').insert({
              rule_id: rule.id,
              company_id: rule.company_id,
              client_id: campaign.client_id,
              campaign_id: campaign.id,
              entity_type: 'campaign',
              action_type: rule.action_type,
              action_result: 'skipped',
              metadata: {
                reason: 'Condições não atendidas',
                conditions_checked: evaluation.description,
                campaign_metrics: {
                  cpa: campaign.cpa,
                  ctr: campaign.ctr,
                  conversions: campaign.conversions,
                  frequency: campaign.frequency,
                  spend: campaign.spend,
                },
              },
            });
            totalSkipped++;
          }
        }

        await supabase
          .from('campaign_automation_rules')
          .update({
            last_execution_at: new Date().toISOString(),
            execution_count: rule.execution_count + 1,
          })
          .eq('id', rule.id);

      } catch (ruleError: any) {
        console.error(`Error processing campaign rule ${rule.id}:`, ruleError);
        totalErrors++;
      }
    }

    // ========== PROCESSAR AD SETS ==========
    for (const rule of adsetRules) {
      try {
        const adsets = await fetchAdSets(supabase, rule.company_id, rule.client_id || undefined);

        const { data: integration } = await supabase
          .from('facebook_integrations')
          .select('*')
          .eq('company_id', rule.company_id)
          .eq('is_active', true)
          .single();

        if (!integration) continue;

        for (const adset of adsets) {
          totalAnalyzed++;

          if (!validateCampaignDataIntegrity(adset)) continue;
          if (!matchesScopeFilters(adset, rule.scope_filters)) continue;

          // 🆕 Verificação explícita de objetivo da regra
          if (rule.campaign_objectives?.length > 0 && adset.campaign_objective) {
            if (!rule.campaign_objectives.includes(adset.campaign_objective)) {
              console.log(`⏭️ Ad Set ${adset.name}: Campaign objective not in rule targets`);
              continue; // Não registra log, apenas pula
            }
          }

          const limitCheck = await checkExecutionLimits(supabase, rule, adset);
          if (!limitCheck.allowed) continue;

          const evaluation = await evaluateConditionsWithTimeWindow(supabase, adset, rule);
          
          if (evaluation.met) {
            console.log(`✅ Ad Set ${adset.name}: ${evaluation.description}`);

            if (mode === 'simulation') {
              simulationResults.push({
                entity_type: 'adset',
                entity_name: adset.name,
                rule_name: rule.rule_name,
                action: rule.action_type,
                reason: evaluation.description,
              });
              continue;
            }

            try {
              let result;
              const prefix = companySettings.get(rule.company_id) || 'SHEGrowth';
              
              if (rule.action_type === 'pause_adset') {
                result = await pauseAdSetSafely(adset, integration, rule, evaluation.description, prefix);
              } else if (rule.action_type === 'duplicate_adset') {
                result = await duplicateAdSetSafely(adset, integration, rule, evaluation.description, prefix);
              }

              const logData: any = {
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: adset.client_id,
                campaign_id: adset.campaign_id,
                adset_id: adset.id,
                entity_type: 'adset',
                action_type: rule.action_type,
                action_result: 'success',
                old_name: result.oldName,
                new_name: result.newName,
                metadata: { adset, result },
              };

              // Recovery trigger configuration
              if (rule.action_config?.enable_recovery_trigger && 
                  rule.action_type === 'pause_adset') {
                const recoveryDays = rule.action_config.recovery_trigger_days || 3;
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + recoveryDays);
                
                logData.recovery_trigger_enabled = true;
                logData.recovery_trigger_days = recoveryDays;
                logData.recovery_scheduled_for = scheduledDate.toISOString();
                
                console.log(`🔄 Recovery scheduled for ${scheduledDate.toISOString()} (${recoveryDays} days)`);
              }

              await supabase.from('campaign_automation_logs').insert(logData);

              totalActioned++;
            } catch (actionError: any) {
              console.error(`❌ Error:`, actionError);
              await supabase.from('campaign_automation_logs').insert({
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: adset.client_id,
                campaign_id: adset.campaign_id,
                adset_id: adset.id,
                entity_type: 'adset',
                action_type: rule.action_type,
                action_result: 'error',
                error_message: actionError.message,
              });
              totalErrors++;
            }
          } else {
            // 🆕 Registrar verificação sem ação
            console.log(`⏭️ Ad Set ${adset.name}: Conditions not met (${evaluation.description})`);
            await supabase.from('campaign_automation_logs').insert({
              rule_id: rule.id,
              company_id: rule.company_id,
              client_id: adset.client_id,
              campaign_id: adset.campaign_id,
              adset_id: adset.id,
              entity_type: 'adset',
              action_type: rule.action_type,
              action_result: 'skipped',
              metadata: {
                reason: 'Condições não atendidas',
                conditions_checked: evaluation.description,
                adset_metrics: {
                  cpa: adset.cpa,
                  ctr: adset.ctr,
                  conversions: adset.conversions,
                  frequency: adset.frequency,
                  spend: adset.spend,
                },
              },
            });
            totalSkipped++;
          }
        }

        await supabase
          .from('campaign_automation_rules')
          .update({
            last_execution_at: new Date().toISOString(),
            execution_count: rule.execution_count + 1,
          })
          .eq('id', rule.id);

      } catch (ruleError: any) {
        console.error(`Error processing adset rule ${rule.id}:`, ruleError);
        totalErrors++;
      }
    }

    // ========== PROCESSAR ADS ==========
    for (const rule of adRules) {
      try {
        const ads = await fetchAds(supabase, rule.company_id, rule.client_id || undefined);

        const { data: integration } = await supabase
          .from('facebook_integrations')
          .select('*')
          .eq('company_id', rule.company_id)
          .eq('is_active', true)
          .single();

        if (!integration) continue;

        for (const ad of ads) {
          totalAnalyzed++;

          if (!validateCampaignDataIntegrity(ad)) continue;
          if (!matchesScopeFilters(ad, rule.scope_filters)) continue;

          // 🆕 Verificação explícita de objetivo da regra
          if (rule.campaign_objectives?.length > 0 && ad.campaign_objective) {
            if (!rule.campaign_objectives.includes(ad.campaign_objective)) {
              console.log(`⏭️ Ad ${ad.name}: Campaign objective not in rule targets`);
              continue; // Não registra log, apenas pula
            }
          }

          const limitCheck = await checkExecutionLimits(supabase, rule, ad);
          if (!limitCheck.allowed) continue;

          const evaluation = await evaluateConditionsWithTimeWindow(supabase, ad, rule);
          
          if (evaluation.met) {
            console.log(`✅ Ad ${ad.name}: ${evaluation.description}`);

            if (mode === 'simulation') {
              simulationResults.push({
                entity_type: 'ad',
                entity_name: ad.name,
                rule_name: rule.rule_name,
                action: rule.action_type,
                reason: evaluation.description,
              });
              continue;
            }

            try {
              let result;
              const prefix = companySettings.get(rule.company_id) || 'SHEGrowth';
              
              if (rule.action_type === 'pause_ad') {
                result = await pauseAdSafely(ad, integration, rule, evaluation.description, prefix);
              } else if (rule.action_type === 'duplicate_ad') {
                result = await duplicateAdSafely(ad, integration, rule, evaluation.description, prefix);
              }

              const logData: any = {
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: ad.client_id,
                campaign_id: ad.campaign_id,
                adset_id: ad.ad_set_id,
                ad_id: ad.id,
                entity_type: 'ad',
                action_type: rule.action_type,
                action_result: 'success',
                old_name: result.oldName,
                new_name: result.newName,
                metadata: { ad, result },
              };

              // Recovery trigger configuration
              if (rule.action_config?.enable_recovery_trigger && 
                  rule.action_type === 'pause_ad') {
                const recoveryDays = rule.action_config.recovery_trigger_days || 3;
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + recoveryDays);
                
                logData.recovery_trigger_enabled = true;
                logData.recovery_trigger_days = recoveryDays;
                logData.recovery_scheduled_for = scheduledDate.toISOString();
                
                console.log(`🔄 Recovery scheduled for ${scheduledDate.toISOString()} (${recoveryDays} days)`);
              }

              await supabase.from('campaign_automation_logs').insert(logData);

              totalActioned++;
            } catch (actionError: any) {
              console.error(`❌ Error:`, actionError);
              await supabase.from('campaign_automation_logs').insert({
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: ad.client_id,
                campaign_id: ad.campaign_id,
                adset_id: ad.ad_set_id,
                ad_id: ad.id,
                entity_type: 'ad',
                action_type: rule.action_type,
                action_result: 'error',
                error_message: actionError.message,
              });
              totalErrors++;
            }
          } else {
            // 🆕 Registrar verificação sem ação
            console.log(`⏭️ Ad ${ad.name}: Conditions not met (${evaluation.description})`);
            await supabase.from('campaign_automation_logs').insert({
              rule_id: rule.id,
              company_id: rule.company_id,
              client_id: ad.client_id,
              campaign_id: ad.campaign_id,
              adset_id: ad.ad_set_id,
              ad_id: ad.id,
              entity_type: 'ad',
              action_type: rule.action_type,
              action_result: 'skipped',
              metadata: {
                reason: 'Condições não atendidas',
                conditions_checked: evaluation.description,
                ad_metrics: {
                  cpa: ad.cpa,
                  ctr: ad.ctr,
                  conversions: ad.conversions,
                  frequency: ad.frequency,
                  spend: ad.spend,
                },
              },
            });
            totalSkipped++;
          }
        }

        await supabase
          .from('campaign_automation_rules')
          .update({
            last_execution_at: new Date().toISOString(),
            execution_count: rule.execution_count + 1,
          })
          .eq('id', rule.id);

      } catch (ruleError: any) {
        console.error(`Error processing ad rule ${rule.id}:`, ruleError);
        totalErrors++;
      }
    }

    console.log(`✨ Complete! Analyzed: ${totalAnalyzed}, Actioned: ${totalActioned}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);

    if (mode === 'simulation') {
      return new Response(
        JSON.stringify({
          simulation: true,
          results: simulationResults,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = client_id 
      ? `Automation execution completed for client ${client_id}`
      : 'Automation execution completed';

    return new Response(
      JSON.stringify({
        success: true,
        message,
        client_id: client_id || null,
        processed: totalAnalyzed,
        analyzed: totalAnalyzed,
        actioned: totalActioned,
        skipped: totalSkipped,
        errors: totalErrors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
