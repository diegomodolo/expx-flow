import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forceRefreshGoogleAdsToken } from "../_shared/googleAdsTokenRefresh.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncOptions {
  period: string;
  campaigns: boolean;
  adGroups: boolean;
  ads: boolean;
  includeInactive: boolean;
}

interface SyncSchedule {
  id: string;
  company_id: string;
  is_enabled: boolean;
  executions_per_day: number;
  scheduled_times: string[];
  sync_options: SyncOptions;
  last_execution_at: string | null;
  next_execution_at: string | null;
}

function shouldExecuteNow(schedule: SyncSchedule): boolean {
  if (!schedule.next_execution_at) return true;
  
  const now = new Date();
  const nextExecution = new Date(schedule.next_execution_at);
  
  return now >= nextExecution;
}

function calculateNextExecution(scheduledTimes: string[]): Date {
  if (!scheduledTimes || scheduledTimes.length === 0) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const timesInMinutes = scheduledTimes
    .map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    })
    .sort((a, b) => a - b);

  for (const timeInMinutes of timesInMinutes) {
    if (timeInMinutes > currentTime) {
      const nextExecution = new Date(now);
      nextExecution.setHours(Math.floor(timeInMinutes / 60));
      nextExecution.setMinutes(timeInMinutes % 60);
      nextExecution.setSeconds(0);
      nextExecution.setMilliseconds(0);
      return nextExecution;
    }
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(Math.floor(timesInMinutes[0] / 60));
  tomorrow.setMinutes(timesInMinutes[0] % 60);
  tomorrow.setSeconds(0);
  tomorrow.setMilliseconds(0);
  return tomorrow;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Google Ads Sync Scheduler: Starting execution');

    // Get all enabled schedules with sync_options
    const { data: schedules, error: schedulesError } = await supabase
      .from('google_ads_sync_schedules')
      .select('*')
      .eq('is_enabled', true);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('No enabled schedules found');
      return new Response(
        JSON.stringify({ message: 'No enabled schedules' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${schedules.length} enabled schedules`);

    let executionCount = 0;
    const results = [];

    for (const schedule of schedules) {
      console.log(`Processing schedule for company ${schedule.company_id}`);

      if (!shouldExecuteNow(schedule)) {
        console.log(`Skipping - next execution at ${schedule.next_execution_at}`);
        continue;
      }

      // Get sync options from schedule (with defaults)
      const syncOptions: SyncOptions = schedule.sync_options || {
        period: 'last_30_days',
        campaigns: true,
        adGroups: false,
        ads: false,
        includeInactive: false,
      };

      console.log(`Sync options for company ${schedule.company_id}:`, syncOptions);

      // ========== FORÇA RENOVAÇÃO DO TOKEN ANTES DE QUALQUER SYNC ==========
      console.log(`🔄 Renovando token para company ${schedule.company_id} antes do sync...`);
      
      const { data: integration, error: integrationError } = await supabase
        .from('google_ads_integrations')
        .select('*')
        .eq('company_id', schedule.company_id)
        .eq('is_active', true)
        .single();

      if (integrationError || !integration) {
        console.error(`❌ No active Google Ads integration for company ${schedule.company_id}:`, integrationError);
        // Criar log de falha
        await supabase
          .from('google_ads_sync_execution_logs')
          .insert({
            company_id: schedule.company_id,
            schedule_id: schedule.id,
            status: 'failed',
            clients_processed: 0,
            clients_total: 0,
            error_message: 'No active Google Ads integration found',
            completed_at: new Date().toISOString(),
          });
        continue;
      }

      try {
        const { accessToken, newExpiresAt } = await forceRefreshGoogleAdsToken(supabase, integration);
        console.log(`✅ Token renovado para company ${schedule.company_id}, expira em: ${newExpiresAt}`);
      } catch (tokenError) {
        console.error(`❌ Falha ao renovar token para company ${schedule.company_id}:`, tokenError);
        // Criar log de falha
        await supabase
          .from('google_ads_sync_execution_logs')
          .insert({
            company_id: schedule.company_id,
            schedule_id: schedule.id,
            status: 'failed',
            clients_processed: 0,
            clients_total: 0,
            error_message: `Token refresh failed: ${tokenError.message}`,
            completed_at: new Date().toISOString(),
          });
        continue;
      }
      // ========== FIM DA RENOVAÇÃO DO TOKEN ==========

      // Build client query based on includeInactive option
      let clientQuery = supabase
        .from('clients')
        .select('id, name, status, inactive_reason')
        .eq('company_id', schedule.company_id)
        .not('google_account_id', 'is', null);

      // If not including inactive clients, filter them out
      if (!syncOptions.includeInactive) {
        // Exclude clients with status='red' and inactive_reason set
        clientQuery = clientQuery.or('status.neq.red,inactive_reason.is.null');
      }

      const { data: clients, error: clientsError } = await clientQuery;

      if (clientsError) {
        console.error(`Error fetching clients for company ${schedule.company_id}:`, clientsError);
        continue;
      }

      if (!clients || clients.length === 0) {
        console.log(`No clients with Google Ads for company ${schedule.company_id}`);
        continue;
      }

      console.log(`Found ${clients.length} clients to sync`);

      // Create execution log
      const { data: executionLog, error: logError } = await supabase
        .from('google_ads_sync_execution_logs')
        .insert({
          company_id: schedule.company_id,
          schedule_id: schedule.id,
          status: 'running',
          clients_processed: 0,
          clients_total: clients.length,
          sync_options: syncOptions,
        })
        .select()
        .single();

      if (logError) {
        console.error('Error creating execution log:', logError);
      }

      let clientsProcessed = 0;
      let failedClients = 0;
      const clientResults = [];

      // Sync each client
      for (const client of clients) {
        try {
          console.log(`Syncing client ${client.name} (${client.id})`);

          const { error: syncError } = await supabase.functions.invoke('sync-google-ads-campaigns', {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: {
              clientId: client.id,
              companyId: schedule.company_id,
              period: syncOptions.period,
              syncCampaigns: syncOptions.campaigns,
              syncAdGroups: syncOptions.adGroups,
              syncAds: syncOptions.ads,
              includeInactive: syncOptions.includeInactive,
              silent: true,
            },
          });

          if (syncError) {
            console.error(`Error syncing client ${client.name}:`, syncError);
            failedClients++;
            clientResults.push({
              client_id: client.id,
              client_name: client.name,
              status: 'error',
              error: syncError.message,
            });
          } else {
            console.log(`Successfully synced client ${client.name}`);
            clientsProcessed++;
            clientResults.push({
              client_id: client.id,
              client_name: client.name,
              status: 'success',
            });
          }

          // Update execution log progress
          if (executionLog) {
            await supabase
              .from('google_ads_sync_execution_logs')
              .update({ clients_processed: clientsProcessed })
              .eq('id', executionLog.id);
          }
        } catch (error) {
          console.error(`Exception syncing client ${client.name}:`, error);
          failedClients++;
          clientResults.push({
            client_id: client.id,
            client_name: client.name,
            status: 'error',
            error: error.message,
          });
        }
      }

      // Determine final status
      let finalStatus = 'completed';
      if (failedClients === clients.length) {
        finalStatus = 'failed';
      } else if (failedClients > 0) {
        finalStatus = 'partial';
      }

      // Update execution log with final status
      if (executionLog) {
        await supabase
          .from('google_ads_sync_execution_logs')
          .update({
            status: finalStatus,
            clients_processed: clientsProcessed,
            completed_at: new Date().toISOString(),
            execution_details: { clients: clientResults },
            error_message: failedClients > 0 ? `${failedClients} client(s) failed to sync` : null,
          })
          .eq('id', executionLog.id);
      }

      // Update schedule
      const nextExecution = calculateNextExecution(schedule.scheduled_times);
      await supabase
        .from('google_ads_sync_schedules')
        .update({
          last_execution_at: new Date().toISOString(),
          next_execution_at: nextExecution.toISOString(),
        })
        .eq('id', schedule.id);

      executionCount++;
      results.push({
        company_id: schedule.company_id,
        clients_synced: clientsProcessed,
        clients_failed: failedClients,
        status: finalStatus,
      });

      console.log(`Updated schedule - next execution at ${nextExecution.toISOString()}`);
    }

    console.log(`Scheduler completed: ${executionCount} schedules executed`);

    return new Response(
      JSON.stringify({
        success: true,
        schedules_executed: executionCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-ads-sync-scheduler:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
