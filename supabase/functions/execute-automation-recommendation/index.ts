import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { recommendation_id, action } = await req.json();

    if (!recommendation_id || !action) {
      throw new Error('recommendation_id and action (approve/reject) are required');
    }

    console.log(`📋 Processing recommendation ${recommendation_id}: ${action}`);

    // Buscar recomendação
    const { data: recommendation, error: recError } = await supabase
      .from('campaign_automation_recommendations')
      .select('*')
      .eq('id', recommendation_id)
      .single();

    if (recError || !recommendation) {
      throw new Error('Recommendation not found');
    }

    if (recommendation.status !== 'pending') {
      throw new Error(`Recommendation already ${recommendation.status}`);
    }

    if (action === 'reject') {
      // Apenas marcar como rejeitada
      await supabase
        .from('campaign_automation_recommendations')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', recommendation_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recommendation rejected',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aprovar e executar
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', recommendation.campaign_id)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('company_id', recommendation.company_id)
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new Error('No active Facebook integration');
    }

    // Executar ação recomendada
    const url = `https://graph.facebook.com/v20.0/${campaign.facebook_id}`;
    const updates: any = { access_token: integration.access_token };

    const oldName = campaign.name;
    let newName = oldName;
    let oldBudget = null;
    let newBudget = null;
    let oldStatus = campaign.status;
    let newStatus = campaign.status;

    if (recommendation.recommended_action === 'pause_campaign') {
      updates.status = 'PAUSED';
      newStatus = 'PAUSED';
      newName = `[SHEGrowth] ${oldName.replace(/^\[SHEGrowth\]\s*/i, '')} - Pausada (Recomendação Aprovada)`;
      updates.name = newName;
    } else if (recommendation.recommended_action === 'activate_campaign') {
      updates.status = 'ACTIVE';
      newStatus = 'ACTIVE';
      newName = `[SHEGrowth] ${oldName.replace(/^\[SHEGrowth\]\s*/i, '')} - Ativada (Recomendação Aprovada)`;
      updates.name = newName;
    } else if (['increase_budget', 'decrease_budget'].includes(recommendation.recommended_action)) {
      const getUrl = `${url}?fields=daily_budget&access_token=${integration.access_token}`;
      const getResponse = await fetch(getUrl);
      const currentData = await getResponse.json();
      
      oldBudget = parseFloat(currentData.daily_budget || '0') / 100;
      const percent = recommendation.action_config.budget_change_percent || 20;
      const multiplier = recommendation.recommended_action === 'increase_budget' ? 1 + (percent/100) : 1 - (percent/100);
      newBudget = oldBudget * multiplier;
      
      updates.daily_budget = Math.round(newBudget * 100);
      newName = `[SHEGrowth] ${oldName.replace(/^\[SHEGrowth\]\s*/i, '')} - Budget ${recommendation.recommended_action === 'increase_budget' ? '+' : '-'}${percent}%`;
      updates.name = newName;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Facebook API error: ${await response.text()}`);
    }

    // Criar log de execução
    const { data: executionLog } = await supabase
      .from('campaign_automation_logs')
      .insert({
        rule_id: recommendation.rule_id,
        company_id: recommendation.company_id,
        client_id: recommendation.client_id,
        campaign_id: recommendation.campaign_id,
        action_type: recommendation.recommended_action,
        action_result: 'success',
        old_name: oldName,
        new_name: newName,
        old_budget: oldBudget,
        new_budget: newBudget,
        old_status: oldStatus,
        new_status: newStatus,
        metadata: { from_recommendation: true },
      })
      .select()
      .single();

    // Atualizar recomendação
    await supabase
      .from('campaign_automation_recommendations')
      .update({
        status: 'executed',
        reviewed_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        execution_log_id: executionLog?.id,
      })
      .eq('id', recommendation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recommendation executed successfully',
        execution_log_id: executionLog?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Execution error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
