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

      if (!client_id || !company_id || executions_per_day === undefined) {
        throw new Error('client_id, company_id and executions_per_day are required');
      }

      // Calculate scheduled times
      const { data: times, error: calcError } = await supabase
        .rpc('calculate_schedule_times', { executions: executions_per_day });

      if (calcError) {
        throw calcError;
      }

      console.log('📅 Calculated times:', times);

      // Calculate next execution time
      const now = new Date();
      const currentTimeMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      
      const scheduledMinutes = (times as string[]).map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      }).sort((a, b) => a - b);
      
      const nextTimeToday = scheduledMinutes.find(minutes => minutes > currentTimeMinutes);
      
      let nextExecution: Date;
      if (nextTimeToday !== undefined) {
        const hours = Math.floor(nextTimeToday / 60);
        const minutes = nextTimeToday % 60;
        nextExecution = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          hours,
          minutes,
          0,
          0
        ));
      } else {
        const firstTimeMinutes = scheduledMinutes[0];
        const hours = Math.floor(firstTimeMinutes / 60);
        const minutes = firstTimeMinutes % 60;
        nextExecution = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          hours,
          minutes,
          0,
          0
        ));
      }

      console.log('⏰ Next execution calculated:', nextExecution.toISOString());

      // Upsert schedule (Cron Master handles execution automatically)
      const { data: schedule, error: upsertError } = await supabase
        .from('automation_schedules')
        .upsert({
          client_id,
          company_id,
          is_enabled: is_enabled ?? true,
          executions_per_day,
          scheduled_times: times || [],
          next_execution_at: nextExecution.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      console.log(`✅ Schedule configured for client ${client_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          schedule,
          message: 'Schedule configured successfully. The Cron Master will execute automations at the scheduled times.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH - Toggle schedule enabled status
    if (method === 'PATCH') {
      const { client_id, is_enabled } = body;

      if (!client_id || is_enabled === undefined) {
        throw new Error('client_id and is_enabled are required');
      }

      // Update schedule
      const { data: schedule, error: updateError } = await supabase
        .from('automation_schedules')
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq('client_id', client_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, schedule }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove schedule
    if (method === 'DELETE') {
      const { client_id } = body;

      if (!client_id) {
        throw new Error('client_id required');
      }

      // Delete schedule (Cron Master will stop executing automatically)
      const { error: deleteError } = await supabase
        .from('automation_schedules')
        .delete()
        .eq('client_id', client_id);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`🗑️ Schedule deleted for client ${client_id}`);

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
