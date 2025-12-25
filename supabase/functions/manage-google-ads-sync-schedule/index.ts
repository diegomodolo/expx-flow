import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function calculateScheduleTimes(executionsPerDay: number): string[] {
  const times: string[] = [];
  const intervalMinutes = (24 * 60) / executionsPerDay;
  let currentMinutes = 0;

  for (let i = 0; i < executionsPerDay; i++) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = Math.floor(currentMinutes % 60);
    times.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return times;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse body for all requests (JSON body instead of query params)
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get';
    const company_id = body.company_id;

    if (!company_id) {
      throw new Error('Missing company_id parameter');
    }

    console.log(`Processing ${action} request for company ${company_id}`);

    if (action === 'get') {
      const { data, error } = await supabase
        .from('google_ads_sync_schedules')
        .select('*')
        .eq('company_id', company_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return new Response(
        JSON.stringify({ schedule: data }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'upsert') {
      const { 
        executions_per_day = 1, 
        is_enabled = true,
        sync_options = {
          period: 'last_30_days',
          campaigns: true,
          adGroups: false,
          ads: false,
          includeInactive: false,
        }
      } = body;

      const scheduled_times = calculateScheduleTimes(executions_per_day);
      const next_execution_at = is_enabled ? calculateNextExecution(scheduled_times) : null;

      const scheduleData = {
        company_id,
        is_enabled,
        executions_per_day,
        scheduled_times,
        sync_options,
        next_execution_at: next_execution_at?.toISOString() || null,
      };

      console.log('Upserting schedule:', scheduleData);

      const { data, error } = await supabase
        .from('google_ads_sync_schedules')
        .upsert(scheduleData, { onConflict: 'company_id' })
        .select()
        .maybeSingle();

      if (error) throw error;

      console.log('Schedule upserted successfully:', data?.id);

      return new Response(
        JSON.stringify({ schedule: data }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'patch') {
      const updates: any = {};

      if (body.is_enabled !== undefined) {
        updates.is_enabled = body.is_enabled;

        const { data: currentSchedule } = await supabase
          .from('google_ads_sync_schedules')
          .select('scheduled_times')
          .eq('company_id', company_id)
          .maybeSingle();

        if (currentSchedule && updates.is_enabled) {
          updates.next_execution_at = calculateNextExecution(currentSchedule.scheduled_times).toISOString();
        } else if (!updates.is_enabled) {
          updates.next_execution_at = null;
        }
      }

      if (body.sync_options !== undefined) {
        updates.sync_options = body.sync_options;
      }

      console.log('Patching schedule:', updates);

      const { data, error } = await supabase
        .from('google_ads_sync_schedules')
        .update(updates)
        .eq('company_id', company_id)
        .select()
        .maybeSingle();

      if (error) throw error;

      console.log('Schedule patched successfully');

      return new Response(
        JSON.stringify({ schedule: data }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'delete') {
      console.log('Deleting schedule');

      const { error } = await supabase
        .from('google_ads_sync_schedules')
        .delete()
        .eq('company_id', company_id);

      if (error) throw error;

      console.log('Schedule deleted successfully');

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in manage-google-ads-sync-schedule:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Check edge function logs for more information',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
