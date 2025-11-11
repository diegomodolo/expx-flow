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

    const { log_id } = await req.json();

    if (!log_id) {
      throw new Error('log_id is required');
    }

    console.log(`🔄 Rolling back automation action: ${log_id}`);

    // Buscar log
    const { data: log, error: logError } = await supabase
      .from('campaign_automation_logs')
      .select('*')
      .eq('id', log_id)
      .single();

    if (logError || !log) {
      throw new Error('Log not found');
    }

    if (log.rolled_back) {
      throw new Error('Action already rolled back');
    }

    if (log.action_result !== 'success') {
      throw new Error('Can only rollback successful actions');
    }

    // Buscar campanha
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('facebook_id')
      .eq('id', log.campaign_id)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Buscar integração do Facebook
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('company_id', log.company_id)
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new Error('No active Facebook integration');
    }

    // Executar rollback baseado no tipo de ação
    const url = `https://graph.facebook.com/v20.0/${campaign.facebook_id}`;
    const updates: any = {};

    // Restaurar nome
    if (log.old_name) {
      updates.name = log.old_name;
    }

    // Restaurar status
    if (log.old_status) {
      updates.status = log.old_status;
    }

    // Restaurar budget
    if (log.old_budget) {
      updates.daily_budget = Math.round(log.old_budget * 100);
    }

    updates.access_token = integration.access_token;

    console.log('📤 Sending rollback to Facebook:', updates);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${errorText}`);
    }

    const result = await response.json();

    // Marcar log como revertido
    const { error: updateError } = await supabase
      .from('campaign_automation_logs')
      .update({
        rolled_back: true,
        rolled_back_at: new Date().toISOString(),
      })
      .eq('id', log_id);

    if (updateError) {
      console.error('Warning: Could not update log:', updateError);
    }

    console.log('✅ Rollback successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Action rolled back successfully',
        restored: {
          name: log.old_name,
          status: log.old_status,
          budget: log.old_budget,
        },
        facebook_response: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Rollback error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
