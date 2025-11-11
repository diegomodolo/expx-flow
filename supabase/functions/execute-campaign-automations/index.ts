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
  conditionsDescription: string
): string {
  let baseName = originalName.replace(/^\[SHEGrowth\]\s*/i, '').trim();
  const dashIndex = baseName.indexOf(' - ');
  if (dashIndex > 0) {
    baseName = baseName.substring(0, dashIndex).trim();
  }
  
  let suffix = '';
  switch (actionType) {
    case 'pause_campaign':
      suffix = `Pausada (${conditionsDescription})`;
      break;
    case 'activate_campaign':
      suffix = `Ativada (${conditionsDescription})`;
      break;
    case 'increase_budget':
      suffix = `Budget Aumentado`;
      break;
    case 'decrease_budget':
      suffix = `Budget Reduzido`;
      break;
    default:
      suffix = conditionsDescription;
  }
  
  return `[SHEGrowth] ${baseName} - ${suffix}`;
}

async function pauseCampaignSafely(
  campaign: any,
  integration: any,
  rule: AutomationRule,
  conditionsDesc: string
) {
  // Validar objetivo
  if (rule.campaign_objectives && campaign.objective) {
    if (!rule.campaign_objectives.includes(campaign.objective)) {
      throw new Error(`Campaign objective ${campaign.objective} not allowed for this rule`);
    }
  }
  
  const newName = buildNewName(campaign.name, 'pause_campaign', conditionsDesc);
  
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
  conditionsDesc: string
) {
  if (rule.campaign_objectives && campaign.objective) {
    if (!rule.campaign_objectives.includes(campaign.objective)) {
      throw new Error(`Campaign objective ${campaign.objective} not allowed for this rule`);
    }
  }
  
  const newName = buildNewName(campaign.name, 'activate_campaign', conditionsDesc);
  
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
  conditionsDesc: string
) {
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
    `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`
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

    let totalAnalyzed = 0;
    let totalActioned = 0;
    let totalErrors = 0;
    const simulationResults: any[] = [];

    for (const rule of rules) {
      try {
        // Buscar campanhas
        let campaignQuery = supabase
          .from('campaigns')
          .select('*, clients!inner(*)')
          .eq('company_id', rule.company_id)
          .eq('is_active', true);

        if (rule.client_id) {
          campaignQuery = campaignQuery.eq('client_id', rule.client_id);
        }

        const { data: campaigns } = await campaignQuery;

        // Buscar integração
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

          // Validações
          if (!validateCampaignDataIntegrity(campaign)) continue;
          if (!matchesScopeFilters(campaign, rule.scope_filters)) continue;

          const limitCheck = await checkExecutionLimits(supabase, rule, campaign);
          if (!limitCheck.allowed) {
            console.log(`⏭️ ${campaign.name}: ${limitCheck.reason}`);
            continue;
          }

          // Avaliar condições
          const evaluation = await evaluateConditionsWithTimeWindow(supabase, campaign, rule);
          
          if (evaluation.met) {
            console.log(`✅ ${campaign.name}: ${evaluation.description}`);

            // Modo simulação
            if (mode === 'simulation') {
              simulationResults.push({
                campaign_name: campaign.name,
                rule_name: rule.rule_name,
                action: rule.action_type,
                reason: evaluation.description,
              });
              continue;
            }

            try {
              let result;
              
              // Executar ação
              if (rule.action_type === 'notify_only') {
                result = await createRecommendation(supabase, rule, campaign, evaluation.description);
              } else if (rule.action_type === 'pause_campaign') {
                result = await pauseCampaignSafely(campaign, integration, rule, evaluation.description);
              } else if (rule.action_type === 'activate_campaign') {
                result = await activateCampaignSafely(campaign, integration, rule, evaluation.description);
              } else if (['increase_budget', 'decrease_budget'].includes(rule.action_type)) {
                result = await adjustBudgetSafely(supabase, campaign, integration, rule, evaluation.description);
              } else {
                throw new Error(`Action ${rule.action_type} not implemented`);
              }

              // Log de sucesso
              await supabase.from('campaign_automation_logs').insert({
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: campaign.client_id,
                campaign_id: campaign.id,
                action_type: rule.action_type,
                action_result: 'success',
                old_name: result.oldName,
                new_name: result.newName,
                old_budget: result.oldBudget,
                new_budget: result.newBudget,
                old_status: result.oldStatus,
                new_status: result.newStatus,
                metadata: { campaign, result },
              });

              totalActioned++;
            } catch (actionError: any) {
              console.error(`❌ Error executing action:`, actionError);

              await supabase.from('campaign_automation_logs').insert({
                rule_id: rule.id,
                company_id: rule.company_id,
                client_id: campaign.client_id,
                campaign_id: campaign.id,
                action_type: rule.action_type,
                action_result: 'error',
                error_message: actionError.message,
                metadata: { campaign },
              });

              totalErrors++;
            }
          }
        }

        // Atualizar última execução
        await supabase
          .from('campaign_automation_rules')
          .update({
            last_execution_at: new Date().toISOString(),
            execution_count: rule.execution_count + 1,
          })
          .eq('id', rule.id);

      } catch (ruleError: any) {
        console.error(`Error processing rule ${rule.id}:`, ruleError);
        totalErrors++;
      }
    }

    console.log(`✨ Complete! Analyzed: ${totalAnalyzed}, Actioned: ${totalActioned}, Errors: ${totalErrors}`);

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
