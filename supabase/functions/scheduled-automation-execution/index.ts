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

    const { client_id } = await req.json();

    console.log('⏰ Scheduled Automation Execution:', { client_id, time: new Date().toISOString() });

    if (!client_id) {
      throw new Error('client_id required');
    }

    // Check if schedule is still active
    const { data: schedule, error: scheduleError } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('client_id', client_id)
      .eq('is_enabled', true)
      .single();

    if (scheduleError || !schedule) {
      console.log('⏭️ Schedule not found or not active:', client_id);
      return new Response(
        JSON.stringify({ success: true, message: 'Schedule not active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate execution ID
    const executionId = crypto.randomUUID();

    console.log('🚀 Invoking execute-campaign-automations:', { client_id, execution_id: executionId });

    // Invoke execute-campaign-automations
    const { data: automationResult, error: automationError } = await supabase.functions.invoke(
      'execute-campaign-automations',
      {
        body: {
          client_id,
          execution_id: executionId,
          scheduled_execution: true
        }
      }
    );

    if (automationError) {
      console.error('❌ Automation execution error:', automationError);
      throw automationError;
    }

    console.log('✅ Automation result:', automationResult);

    // Calculate next execution time
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let nextExecutionAt: string | null = null;

    for (const time of schedule.scheduled_times) {
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
    if (!nextExecutionAt && schedule.scheduled_times.length > 0) {
      const [hour, minute] = schedule.scheduled_times[0].split(':').map(Number);
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hour, minute, 0, 0);
      nextExecutionAt = next.toISOString();
    }

    // Update schedule with last execution and next execution time
    await supabase
      .from('automation_schedules')
      .update({
        last_execution_at: new Date().toISOString(),
        next_execution_at: nextExecutionAt
      })
      .eq('id', schedule.id);

    // Only log if there were actual actions taken
    const totalActioned = automationResult?.total_actioned || 0;
    
    if (totalActioned > 0) {
      console.log(`✅ ${totalActioned} automações executadas`);
      
      // Log to automation_execution_progress
      await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: schedule.company_id,
        client_id: client_id,
        entity_type: 'campaign',
        entity_name: 'Sistema Agendado',
        status: 'actioned',
        rule_name: 'Execução Agendada',
        message: `✅ ${totalActioned} ações automáticas executadas`,
        action_details: automationResult
      });
    } else {
      console.log('⏭️ Nenhuma ação necessária nesta execução');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        execution_id: executionId,
        actions_taken: totalActioned,
        next_execution_at: nextExecutionAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in scheduled-automation-execution:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
