import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncSchedule {
  id: string;
  company_id: string;
  is_enabled: boolean;
  executions_per_day: number;
  scheduled_times: string[];
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

    // Get all enabled schedules
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

      // Get all clients with Google Ads for this company
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', schedule.company_id)
        .not('google_account_id', 'is', null)
        .neq('status', 'inativo' as any);

      if (clientsError) {
        console.error(`Error fetching clients for company ${schedule.company_id}:`, clientsError);
        continue;
      }

      if (!clients || clients.length === 0) {
        console.log(`No clients with Google Ads for company ${schedule.company_id}`);
        continue;
      }

      console.log(`Found ${clients.length} clients to sync`);

      // Sync each client
      for (const client of clients) {
        try {
          console.log(`Syncing client ${client.name} (${client.id})`);

          const { error: syncError } = await supabase.functions.invoke('sync-google-ads-campaigns', {
            body: {
              clientId: client.id,
              companyId: schedule.company_id,
              period: 'last_30_days',
              syncCampaigns: true,
              syncAdGroups: false,
              syncAds: false,
              includeInactive: false,
              silent: true,
            },
          });

          if (syncError) {
            console.error(`Error syncing client ${client.name}:`, syncError);
            results.push({
              client_id: client.id,
              client_name: client.name,
              status: 'error',
              error: syncError.message,
            });
          } else {
            console.log(`Successfully synced client ${client.name}`);
            results.push({
              client_id: client.id,
              client_name: client.name,
              status: 'success',
            });
          }
        } catch (error) {
          console.error(`Exception syncing client ${client.name}:`, error);
          results.push({
            client_id: client.id,
            client_name: client.name,
            status: 'error',
            error: error.message,
          });
        }
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
