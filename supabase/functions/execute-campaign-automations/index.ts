import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRule {
  id: string;
  rule_name: string;
  company_id: string;
  client_id?: string;
  entity_type: 'campaign' | 'adset' | 'ad';
  action_type: string;
  conditions: any;
  action_config: any;
  time_window_days: number;
  scope_filters?: any;
  safety_limits?: any;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { client_id, execution_id } = await req.json();

    console.log('🚀 Starting automation execution:', { client_id, execution_id });

    // Buscar regras ativas
    const { data: rules, error: rulesError } = await supabase
      .from('campaign_automation_rules')
      .select('*')
      .eq('is_active', true)
      .or(`client_id.eq.${client_id},client_id.is.null`);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma regra ativa encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${rules.length} active rules`);

    // Buscar integração do Facebook
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, company_id')
      .eq('company_id', rules[0].company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integração com Facebook não encontrada ou inativa');
    }

    const accessToken = integration.access_token;
    let totalProcessed = 0;
    let totalActioned = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Agrupar regras por entity_type
    const rulesByType: Record<string, AutomationRule[]> = {
      campaign: (rules as AutomationRule[]).filter(r => r.entity_type === 'campaign'),
      adset: (rules as AutomationRule[]).filter(r => r.entity_type === 'adset'),
      ad: (rules as AutomationRule[]).filter(r => r.entity_type === 'ad')
    };

    // ========== PROCESSAR CAMPANHAS ==========
    if (rulesByType.campaign.length > 0) {
      console.log(`\n🎯 Processing ${rulesByType.campaign.length} campaign rules`);
      
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id, client_id, campaign_id')
        .eq('client_id', client_id)
        .eq('is_active', true)
        .not('facebook_id', 'is', null);

      console.log(`📦 Found ${campaigns?.length || 0} active campaigns`);

      for (const entity of campaigns || []) {
        // Determinar maior time_window entre as regras
        const maxTimeWindow = Math.max(...rulesByType.campaign.map(r => r.time_window_days));
        
        // Buscar métricas UMA VEZ
        const metrics = await fetchFacebookMetrics(entity, maxTimeWindow, accessToken, execution_id, supabase, rulesByType.campaign[0].company_id);
        
        if (!metrics) {
          totalSkipped++;
          continue;
        }

        totalProcessed++;

        // Aplicar TODAS as regras de campanha
        for (const rule of rulesByType.campaign) {
          const result = await processEntityWithRule(
            entity,
            rule,
            metrics,
            execution_id,
            accessToken,
            supabase
          );
          
          if (result === 'actioned') totalActioned++;
          else if (result === 'skipped') totalSkipped++;
          else if (result === 'error') totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // ========== PROCESSAR AD SETS ==========
    if (rulesByType.adset.length > 0) {
      console.log(`\n🎯 Processing ${rulesByType.adset.length} adset rules`);
      
      const { data: adsets } = await supabase
        .from('ad_sets')
        .select(`
          id, 
          name, 
          facebook_id, 
          client_id, 
          campaign_id,
          campaigns!inner(id, is_active)
        `)
        .eq('client_id', client_id)
        .eq('is_active', true)
        .eq('campaigns.is_active', true)
        .not('facebook_id', 'is', null);

      console.log(`📦 Found ${adsets?.length || 0} active ad sets from active campaigns`);

      for (const entity of adsets || []) {
        const maxTimeWindow = Math.max(...rulesByType.adset.map(r => r.time_window_days));
        
        const metrics = await fetchFacebookMetrics(entity, maxTimeWindow, accessToken, execution_id, supabase, rulesByType.adset[0].company_id);
        
        if (!metrics) {
          totalSkipped++;
          continue;
        }

        totalProcessed++;

        for (const rule of rulesByType.adset) {
          const result = await processEntityWithRule(
            entity,
            rule,
            metrics,
            execution_id,
            accessToken,
            supabase
          );
          
          if (result === 'actioned') totalActioned++;
          else if (result === 'skipped') totalSkipped++;
          else if (result === 'error') totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // ========== PROCESSAR ADS ==========
    if (rulesByType.ad.length > 0) {
      console.log(`\n🎯 Processing ${rulesByType.ad.length} ad rules`);
      
      const { data: ads } = await supabase
        .from('ads')
        .select(`
          id, 
          name, 
          facebook_id, 
          client_id, 
          campaign_id, 
          ad_set_id,
          ad_sets!inner(id, is_active, campaign_id, campaigns!inner(id, is_active))
        `)
        .eq('client_id', client_id)
        .eq('is_active', true)
        .eq('ad_sets.is_active', true)
        .eq('ad_sets.campaigns.is_active', true)
        .not('facebook_id', 'is', null);

      console.log(`📦 Found ${ads?.length || 0} active ads from active ad sets in active campaigns`);

      for (const entity of ads || []) {
        const maxTimeWindow = Math.max(...rulesByType.ad.map(r => r.time_window_days));
        
        const metrics = await fetchFacebookMetrics(entity, maxTimeWindow, accessToken, execution_id, supabase, rulesByType.ad[0].company_id);
        
        if (!metrics) {
          totalSkipped++;
          continue;
        }

        totalProcessed++;

        for (const rule of rulesByType.ad) {
          const result = await processEntityWithRule(
            entity,
            rule,
            metrics,
            execution_id,
            accessToken,
            supabase
          );
          
          if (result === 'actioned') totalActioned++;
          else if (result === 'skipped') totalSkipped++;
          else if (result === 'error') totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n✨ Automation execution completed:', { 
      totalProcessed, 
      totalActioned, 
      totalSkipped, 
      totalErrors 
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        totalActioned,
        totalSkipped,
        totalErrors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in execute-campaign-automations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============ FUNÇÕES AUXILIARES ============

// Buscar métricas do Facebook
async function fetchFacebookMetrics(
  entity: any,
  timeWindowDays: number,
  accessToken: string,
  executionId: string,
  supabase: any,
  companyId: string
): Promise<any | null> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeWindowDays);
  const endDate = new Date();

  const sinceStr = startDate.toISOString().split('T')[0];
  const untilStr = endDate.toISOString().split('T')[0];

  console.log(`📊 Fetching metrics for ${entity.name} (${sinceStr} to ${untilStr})`);

  const insightsUrl = `https://graph.facebook.com/v20.0/${entity.facebook_id}/insights?` +
    `fields=impressions,clicks,spend,actions,frequency,reach,ctr,cpc,cost_per_action_type&` +
    `time_range={"since":"${sinceStr}","until":"${untilStr}"}&` +
    `access_token=${accessToken}`;

  try {
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.error) {
      console.error('❌ Facebook API error:', insightsData.error);
      return null;
    }

    if (!insightsData.data || insightsData.data.length === 0) {
      console.log(`⏭️  No insights data for ${entity.name}`);
      return null;
    }

    const insights = insightsData.data[0];

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

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;

    console.log(`📈 Metrics: CPA=${cpa.toFixed(2)}, CTR=${ctr.toFixed(2)}%, Conversions=${conversions}`);

    return {
      impressions,
      clicks,
      spend,
      conversions,
      reach,
      frequency,
      ctr,
      cpc,
      cpa
    };
  } catch (error: any) {
    console.error(`❌ Error fetching metrics for ${entity.name}:`, error);
    return null;
  }
}

// Processar entidade com regra
async function processEntityWithRule(
  entity: any,
  rule: AutomationRule,
  metrics: any,
  executionId: string,
  accessToken: string,
  supabase: any
): Promise<'skipped' | 'actioned' | 'error'> {
  console.log(`\n⚙️  Applying rule: ${rule.rule_name} to ${entity.name}`);

  try {
    const conditionsMet = evaluateConditions(rule.conditions, metrics);

    if (conditionsMet) {
      console.log(`✅ Conditions met, executing action: ${rule.action_type}`);

      const actionResult = await executeAction(
        entity.facebook_id,
        rule.action_type,
        rule.action_config,
        rule.entity_type,
        accessToken
      );

      if (actionResult.success) {
        await supabase.from('automation_execution_progress').insert({
          execution_id: executionId,
          company_id: rule.company_id,
          client_id: entity.client_id,
          entity_type: rule.entity_type,
          entity_name: entity.name,
          entity_id: entity.id,
          facebook_id: entity.facebook_id,
          status: 'actioned',
          rule_name: rule.rule_name,
          message: `✓ ${getActionDescription(rule.action_type)} (CPA: R$ ${metrics.cpa.toFixed(2)}, Conversões: ${metrics.conversions})`
        });

        await supabase.from('campaign_automation_logs').insert({
          rule_id: rule.id,
          company_id: rule.company_id,
          client_id: entity.client_id,
          campaign_id: entity.campaign_id || null,
          entity_type: rule.entity_type,
          entity_id: entity.id,
          action_taken: rule.action_type,
          conditions_met: rule.conditions,
          action_result: 'success',
          details: `CPA: R$ ${metrics.cpa.toFixed(2)}, CTR: ${metrics.ctr.toFixed(2)}%, Conversões: ${metrics.conversions}, Spend: R$ ${metrics.spend.toFixed(2)}`,
          campaign_data: metrics
        });

        return 'actioned';
      } else {
        throw new Error(actionResult.error || 'Erro ao executar ação');
      }
    } else {
      console.log(`⏭️  Conditions not met, skipping`);
      await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: rule.company_id,
        client_id: entity.client_id,
        entity_type: rule.entity_type,
        entity_name: entity.name,
        entity_id: entity.id,
        facebook_id: entity.facebook_id,
        status: 'skipped',
        rule_name: rule.rule_name,
        message: `Condições não atendidas (CPA: R$ ${metrics.cpa.toFixed(2)}, CTR: ${metrics.ctr.toFixed(2)}%)`
      });
      return 'skipped';
    }
  } catch (error: any) {
    console.error(`❌ Error processing ${entity.name} with rule ${rule.rule_name}:`, error);
    
    await supabase.from('automation_execution_progress').insert({
      execution_id: executionId,
      company_id: rule.company_id,
      client_id: entity.client_id,
      entity_type: rule.entity_type,
      entity_name: entity.name,
      entity_id: entity.id,
      facebook_id: entity.facebook_id,
      status: 'error',
      rule_name: rule.rule_name,
      message: `Erro: ${error.message}`
    });

    return 'error';
  }
}

// Avaliar condições
function evaluateConditions(conditions: any, metrics: any): boolean {
  if (!conditions || !conditions.conditions) return false;

  const logic = conditions.logic || 'AND';
  const conditionsList = conditions.conditions;

  const results = conditionsList.map((cond: any) => {
    const metricValue = metrics[cond.field];
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

  if (logic === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

// Executar ação no Facebook
async function executeAction(
  facebookId: string,
  actionType: string,
  actionConfig: any,
  entityType: string,
  accessToken: string
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
        body = { status: 'PAUSED' };
        break;
      
      case 'activate':
      case 'activate_campaign':
      case 'activate_adset':
      case 'activate_ad':
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        body = { status: 'ACTIVE' };
        break;
      
      case 'adjust_budget':
      case 'increase_budget':
      case 'decrease_budget':
        if (entityType !== 'campaign' && entityType !== 'adset') {
          return { success: false, error: 'Ajuste de budget só disponível para campanhas e conjuntos' };
        }
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        
        // Calcular novo budget
        let newBudget = actionConfig.new_budget;
        if (actionType === 'increase_budget' && actionConfig.increase_percentage) {
          // Buscar budget atual primeiro
          const currentResponse = await fetch(
            `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
          );
          const currentData = await currentResponse.json();
          const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
          newBudget = currentBudget * (1 + actionConfig.increase_percentage / 100);
        } else if (actionType === 'decrease_budget' && actionConfig.decrease_percentage) {
          const currentResponse = await fetch(
            `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
          );
          const currentData = await currentResponse.json();
          const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
          newBudget = currentBudget * (1 - actionConfig.decrease_percentage / 100);
        }
        
        body = {
          daily_budget: newBudget ? Math.round(newBudget * 100) : undefined,
        };
        break;
      
      default:
        console.log(`⚠️  Action type not implemented yet: ${actionType}`);
        return { success: false, error: `Tipo de ação não implementado: ${actionType}` };
    }

    console.log(`🔧 Executing Facebook API call:`, { url, body });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        access_token: accessToken
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`✅ Action executed successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error executing action:', error);
    return { success: false, error: error.message };
  }
}

function getActionDescription(actionType: string): string {
  const descriptions: Record<string, string> = {
    pause: 'Pausado',
    pause_campaign: 'Campanha Pausada',
    pause_adset: 'Conjunto Pausado',
    pause_ad: 'Anúncio Pausado',
    activate: 'Ativado',
    activate_campaign: 'Campanha Ativada',
    activate_adset: 'Conjunto Ativado',
    activate_ad: 'Anúncio Ativado',
    adjust_budget: 'Budget Ajustado',
    increase_budget: 'Budget Aumentado',
    decrease_budget: 'Budget Reduzido',
  };
  return descriptions[actionType] || actionType;
}
