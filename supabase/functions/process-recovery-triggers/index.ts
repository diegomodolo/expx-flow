// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    
    console.log(`🔄 [Recovery Triggers] Starting recovery process at ${now.toISOString()}`);
    
    // Buscar logs pendentes de recovery que já atingiram a data agendada
    const { data: pendingRecoveries, error: fetchError } = await supabase
      .from('campaign_automation_logs')
      .select(`
        *,
        campaigns!campaign_automation_logs_campaign_id_fkey(
          id, name, facebook_id, status, client_id, 
          clients(ad_account_id, facebook_integrations(access_token))
        ),
        ad_sets!campaign_automation_logs_adset_id_fkey(
          id, name, facebook_id, status, client_id, campaign_id,
          clients(ad_account_id, facebook_integrations(access_token))
        ),
        ads!campaign_automation_logs_ad_id_fkey(
          id, name, facebook_id, status, client_id, campaign_id, ad_set_id,
          clients(ad_account_id, facebook_integrations(access_token))
        )
      `)
      .eq('recovery_trigger_enabled', true)
      .eq('recovery_executed', false)
      .eq('action_result', 'success')
      .lte('recovery_scheduled_for', now.toISOString())
      .order('recovery_scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching pending recoveries:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${pendingRecoveries?.length || 0} pending recoveries`);

    const results = {
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0
    };

    for (const log of pendingRecoveries || []) {
      results.processed++;
      
      try {
        // Determinar a entidade e ação de recovery
        let entity: any, entityType: string, recoveryAction: string, facebookId: string, accessToken: string;
        
        if (log.entity_type === 'campaign' && log.campaigns) {
          entity = log.campaigns;
          entityType = 'campaign';
          recoveryAction = 'activate_campaign';
          facebookId = entity.facebook_id;
          accessToken = entity.clients?.facebook_integrations?.[0]?.access_token;
        } else if (log.entity_type === 'adset' && log.ad_sets) {
          entity = log.ad_sets;
          entityType = 'adset';
          recoveryAction = 'activate_adset';
          facebookId = entity.facebook_id;
          accessToken = entity.clients?.facebook_integrations?.[0]?.access_token;
        } else if (log.entity_type === 'ad' && log.ads) {
          entity = log.ads;
          entityType = 'ad';
          recoveryAction = 'activate_ad';
          facebookId = entity.facebook_id;
          accessToken = entity.clients?.facebook_integrations?.[0]?.access_token;
        }

        if (!entity || !facebookId || !accessToken) {
          console.log(`⏭️ Skipping log ${log.id}: entity or credentials not found`);
          results.skipped++;
          continue;
        }

        // Verificar se ainda está pausada
        if (entity.status !== 'PAUSED') {
          console.log(`⏭️ Skipping log ${log.id}: entity is not paused (status: ${entity.status})`);
          
          // Marcar como executado mesmo assim para não processar novamente
          await supabase
            .from('campaign_automation_logs')
            .update({
              recovery_executed: true,
              recovery_executed_at: now.toISOString(),
              metadata: {
                ...log.metadata,
                recovery_skipped_reason: 'Entity not paused'
              }
            })
            .eq('id', log.id);
          
          results.skipped++;
          continue;
        }

        // Executar reativação via Facebook API
        console.log(`🔄 Reactivating ${entityType}: ${entity.name}`);
        
        const updateUrl = `https://graph.facebook.com/v20.0/${facebookId}`;
        const response = await fetch(updateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ACTIVE',
            access_token: accessToken,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Facebook API error: ${errorText}`);
        }

        const fbResult = await response.json();

        // Criar novo log para a ação de recovery
        const { data: recoveryLog, error: recoveryLogError } = await supabase
          .from('campaign_automation_logs')
          .insert({
            rule_id: log.rule_id,
            company_id: log.company_id,
            client_id: log.client_id,
            campaign_id: log.campaign_id,
            adset_id: log.adset_id,
            ad_id: log.ad_id,
            entity_type: log.entity_type,
            action_type: recoveryAction,
            action_result: 'success',
            old_status: 'PAUSED',
            new_status: 'ACTIVE',
            old_name: entity.name,
            new_name: entity.name,
            metadata: {
              recovery_from_log_id: log.id,
              original_action: log.action_type,
              scheduled_for: log.recovery_scheduled_for,
              days_paused: log.recovery_trigger_days,
              facebook_result: fbResult
            }
          })
          .select()
          .single();

        if (recoveryLogError) {
          console.error('❌ Error creating recovery log:', recoveryLogError);
          throw recoveryLogError;
        }

        // Atualizar log original marcando como executado
        const { error: updateError } = await supabase
          .from('campaign_automation_logs')
          .update({
            recovery_executed: true,
            recovery_executed_at: now.toISOString(),
            recovery_log_id: recoveryLog.id
          })
          .eq('id', log.id);

        if (updateError) {
          console.error('❌ Error updating original log:', updateError);
          throw updateError;
        }

        console.log(`✅ Recovery successful for ${entity.name}`);
        results.success++;

      } catch (error: any) {
        console.error(`❌ Error processing recovery for log ${log.id}:`, error);
        results.errors++;
        
        // Registrar erro no log
        await supabase
          .from('campaign_automation_logs')
          .update({
            metadata: {
              ...log.metadata,
              recovery_error: error.message,
              recovery_error_at: now.toISOString()
            }
          })
          .eq('id', log.id);
      }
    }

    console.log(`✨ Recovery process complete! Success: ${results.success}, Errors: ${results.errors}, Skipped: ${results.skipped}`);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: `Processed ${results.processed} recoveries: ${results.success} success, ${results.errors} errors, ${results.skipped} skipped`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
