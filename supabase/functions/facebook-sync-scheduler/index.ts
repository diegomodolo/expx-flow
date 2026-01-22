import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateNextExecution(scheduledTimes: string[], currentDate: Date = new Date()): Date {
  const now = currentDate;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (const time of scheduledTimes) {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(today);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    if (scheduledDate > now) {
      return scheduledDate;
    }
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = scheduledTimes[0].split(':').map(Number);
  tomorrow.setHours(hours, minutes, 0, 0);
  
  return tomorrow;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 Facebook Sync Scheduler started');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar schedules que precisam ser executados
    const now = new Date().toISOString();
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('facebook_sync_schedules')
      .select('*')
      .eq('is_enabled', true)
      .or(`next_execution_at.is.null,next_execution_at.lte.${now}`);

    if (schedulesError) throw schedulesError;

    if (!schedules || schedules.length === 0) {
      console.log('✅ No schedules to execute');
      return new Response(JSON.stringify({ message: 'No schedules to execute' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Found ${schedules.length} schedule(s) to execute`);

    const results = [];

    for (const schedule of schedules) {
      console.log(`\n🎯 Processing schedule for company ${schedule.company_id}`);
      
      try {
        // Criar log de execução
        const { data: executionLog, error: logError } = await supabaseAdmin
          .from('facebook_sync_execution_logs')
          .insert({
            company_id: schedule.company_id,
            schedule_id: schedule.id,
            status: 'running',
            sync_options: schedule.sync_options,
          })
          .select()
          .single();

        if (logError) throw logError;

        // Buscar clientes da empresa
        let clientsQuery = supabaseAdmin
          .from('clients')
          .select('id, name, ad_account_id, status, inactive_reason')
          .eq('company_id', schedule.company_id)
          .not('ad_account_id', 'is', null);

        // Filtrar clientes inativos se necessário
        if (!schedule.sync_options.includeInactive) {
          clientsQuery = clientsQuery.or('status.neq.red,inactive_reason.is.null,inactive_reason.eq.');
        }

        const { data: clients, error: clientsError } = await clientsQuery;

        if (clientsError) throw clientsError;

        const totalClients = clients?.length || 0;
        console.log(`👥 Found ${totalClients} client(s) to sync`);

        // Atualizar total de clientes no log
        await supabaseAdmin
          .from('facebook_sync_execution_logs')
          .update({ clients_total: totalClients })
          .eq('id', executionLog.id);

        let successCount = 0;
        let failedCount = 0;
        const executionDetails: any = {};

        // Sincronizar cada cliente
        for (const client of clients || []) {
          try {
            console.log(`  📊 Syncing client: ${client.name}`);
            
            const { data: syncResult, error: syncError } = await supabaseAdmin.functions.invoke(
              'sync-facebook-campaigns',
              {
                body: {
                  clientId: client.id,
                  period: schedule.sync_options.period,
                  syncCampaigns: schedule.sync_options.campaigns,
                  syncAdSets: schedule.sync_options.adsets,
                  syncAds: schedule.sync_options.ads,
                  includeInactive: schedule.sync_options.includeInactive,
                },
              }
            );

            if (syncError || !syncResult?.success) {
              failedCount++;
              executionDetails[client.id] = {
                client_name: client.name,
                status: 'failed',
                error: syncError?.message || syncResult?.error || 'Unknown error',
              };
              console.log(`  ❌ Failed to sync ${client.name}`);
            } else {
              successCount++;
              executionDetails[client.id] = {
                client_name: client.name,
                status: 'success',
                job_id: syncResult.job_id,
              };
              console.log(`  ✅ Successfully synced ${client.name}`);
            }
          } catch (clientError) {
            failedCount++;
            executionDetails[client.id] = {
              client_name: client.name,
              status: 'failed',
              error: clientError.message,
            };
            console.log(`  ❌ Error syncing ${client.name}:`, clientError.message);
          }

          // Atualizar progresso
          await supabaseAdmin
            .from('facebook_sync_execution_logs')
            .update({
              clients_processed: successCount + failedCount,
              execution_details: executionDetails,
            })
            .eq('id', executionLog.id);
        }

        // Finalizar log de execução
        const finalStatus = failedCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
        await supabaseAdmin
          .from('facebook_sync_execution_logs')
          .update({
            status: finalStatus,
            clients_processed: successCount + failedCount,
            completed_at: new Date().toISOString(),
            execution_details: executionDetails,
            error_message: failedCount > 0 ? `${failedCount} client(s) failed to sync` : null,
          })
          .eq('id', executionLog.id);

        // Calcular próximo horário de execução
        const nextExecution = calculateNextExecution(schedule.scheduled_times);
        
        // Atualizar schedule
        await supabaseAdmin
          .from('facebook_sync_schedules')
          .update({
            last_execution_at: new Date().toISOString(),
            next_execution_at: nextExecution.toISOString(),
          })
          .eq('id', schedule.id);

        console.log(`✅ Completed schedule for company ${schedule.company_id}`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);
        console.log(`   Next execution: ${nextExecution.toISOString()}`);

        // ========== VALIDAR URLs APÓS SINCRONIZAÇÃO ==========
        console.log(`🔗 Starting URL validation for company ${schedule.company_id}`);
        try {
          const { data: urlValidationResult, error: urlValidationError } = await supabaseAdmin.functions.invoke(
            'validate-client-urls',
            {
              body: { company_id: schedule.company_id }
            }
          );
          
          if (urlValidationError) {
            console.error(`❌ URL validation failed for company ${schedule.company_id}:`, urlValidationError.message);
          } else {
            console.log(`✅ URL validation completed for company ${schedule.company_id}:`, urlValidationResult?.summary || urlValidationResult?.message);
          }
        } catch (urlError) {
          console.error(`❌ URL validation error for company ${schedule.company_id}:`, urlError.message);
        }
        // ========== FIM DA VALIDAÇÃO DE URLs ==========

        results.push({
          company_id: schedule.company_id,
          status: finalStatus,
          success_count: successCount,
          failed_count: failedCount,
          total_clients: totalClients,
          next_execution: nextExecution.toISOString(),
        });

      } catch (scheduleError) {
        console.error(`❌ Error processing schedule for company ${schedule.company_id}:`, scheduleError);
        results.push({
          company_id: schedule.company_id,
          status: 'failed',
          error: scheduleError.message,
        });
      }
    }

    console.log('\n✅ Facebook Sync Scheduler completed');
    return new Response(JSON.stringify({ 
      success: true,
      schedules_processed: schedules.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Critical error in Facebook Sync Scheduler:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
