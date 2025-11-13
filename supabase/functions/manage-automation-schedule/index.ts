import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { method } = req;
    const body = method !== 'GET' ? await req.json() : null;

    console.log('🎯 Manage Automation Schedule:', { method, body });

    // GET - Fetch schedule for a client
    if (method === 'GET') {
      const url = new URL(req.url);
      const clientId = url.searchParams.get('client_id');

      if (!clientId) {
        throw new Error('client_id required');
      }

      const { data: schedule, error } = await supabase
        .from('automation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, schedule }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create or update schedule
    if (method === 'POST') {
      const { client_id, company_id, is_enabled, executions_per_day } = body;

      if (!client_id || !company_id) {
        throw new Error('client_id and company_id required');
      }

      // Calculate scheduled times
      const { data: times, error: calcError } = await supabase
        .rpc('calculate_schedule_times', { executions: executions_per_day });

      if (calcError) {
        throw calcError;
      }

      console.log('📅 Calculated times:', times);

      // Check if schedule exists
      const { data: existing } = await supabase
        .from('automation_schedules')
        .select('id, cron_job_ids')
        .eq('client_id', client_id)
        .single();

      let scheduleId: string;
      let previousCronJobs: any[] = [];

      if (existing) {
        // Update existing schedule
        scheduleId = existing.id;
        previousCronJobs = existing.cron_job_ids || [];

        // Delete old cron jobs if disabling or changing frequency
        if (previousCronJobs.length > 0) {
          for (const jobId of previousCronJobs) {
            try {
              await supabase.rpc('cron.unschedule', { job_name: jobId });
              console.log(`🗑️ Removed cron job: ${jobId}`);
            } catch (error) {
              console.error(`Failed to remove cron job ${jobId}:`, error);
            }
          }
        }
      }

      // Calculate next execution time
      let nextExecutionAt: string | null = null;
      
      if (is_enabled && times && times.length > 0) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        for (const time of times) {
          const [hour, minute] = time.split(':').map(Number);
          const scheduleMinutes = hour * 60 + minute;
          
          if (scheduleMinutes > currentTime) {
            const next = new Date(now);
            next.setHours(hour, minute, 0, 0);
            nextExecutionAt = next.toISOString();
            break;
          }
        }

        // If no time found today, use first time tomorrow
        if (!nextExecutionAt) {
          const [hour, minute] = times[0].split(':').map(Number);
          const next = new Date(now);
          next.setDate(next.getDate() + 1);
          next.setHours(hour, minute, 0, 0);
          nextExecutionAt = next.toISOString();
        }
      }

      // Upsert schedule (sem criar cron jobs por enquanto - eles precisam ser configurados manualmente)
      const scheduleData = {
        client_id,
        company_id,
        is_enabled,
        executions_per_day,
        scheduled_times: times || [],
        cron_job_ids: [], // Será preenchido quando os cron jobs forem configurados manualmente
        next_execution_at: nextExecutionAt,
        updated_at: new Date().toISOString(),
      };

      const { data: schedule, error: upsertError } = await supabase
        .from('automation_schedules')
        .upsert(scheduleData, { onConflict: 'client_id' })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      console.log(`✅ Schedule ${is_enabled ? 'enabled' : 'disabled'} for client ${client_id}`);
      console.log(`📅 Executions per day: ${executions_per_day}`);
      console.log(`⏰ Scheduled times:`, times);
      console.log(`⚠️ IMPORTANT: Configure cron jobs manually in Supabase Dashboard`);
      console.log(`Use the following times for cron jobs: ${times?.join(', ')}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          schedule,
          message: is_enabled 
            ? `Schedule enabled with ${executions_per_day} executions per day. Configure cron jobs manually in Supabase Dashboard.`
            : 'Schedule disabled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove schedule
    if (method === 'DELETE') {
      const { client_id } = body;

      if (!client_id) {
        throw new Error('client_id required');
      }

      // Get existing schedule to remove cron jobs
      const { data: existing } = await supabase
        .from('automation_schedules')
        .select('cron_job_ids')
        .eq('client_id', client_id)
        .single();

      if (existing && existing.cron_job_ids) {
        for (const jobId of existing.cron_job_ids) {
          try {
            await supabase.rpc('cron.unschedule', { job_name: jobId });
            console.log(`🗑️ Removed cron job: ${jobId}`);
          } catch (error) {
            console.error(`Failed to remove cron job ${jobId}:`, error);
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('automation_schedules')
        .delete()
        .eq('client_id', client_id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Method not allowed');

  } catch (error: any) {
    console.error('Error in manage-automation-schedule:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
