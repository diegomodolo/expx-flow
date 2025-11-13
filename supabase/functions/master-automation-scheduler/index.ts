import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationSchedule {
  id: string;
  company_id: string;
  client_id: string;
  is_enabled: boolean;
  executions_per_day: number;
  scheduled_times: string[];
  next_execution_at: string;
  last_execution_at: string | null;
}

function calculateNextExecution(scheduledTimes: string[], currentDate: Date = new Date()): Date {
  const now = new Date(currentDate);
  const currentTimeMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  
  // Converter scheduled_times para minutos desde meia-noite
  const scheduledMinutes = scheduledTimes.map(time => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }).sort((a, b) => a - b);
  
  // Encontrar próximo horário hoje
  const nextTimeToday = scheduledMinutes.find(minutes => minutes > currentTimeMinutes);
  
  if (nextTimeToday !== undefined) {
    // Há um horário ainda hoje
    const hours = Math.floor(nextTimeToday / 60);
    const minutes = nextTimeToday % 60;
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hours,
      minutes,
      0,
      0
    ));
    return next;
  } else {
    // Todos os horários de hoje já passaram, pegar primeiro horário de amanhã
    const firstTimeMinutes = scheduledMinutes[0];
    const hours = Math.floor(firstTimeMinutes / 60);
    const minutes = firstTimeMinutes % 60;
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      hours,
      minutes,
      0,
      0
    ));
    return next;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🤖 Master Automation Scheduler started at:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar agendamentos ativos onde next_execution_at <= NOW()
    const { data: schedules, error: fetchError } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('is_enabled', true)
      .lte('next_execution_at', new Date().toISOString())
      .order('next_execution_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching schedules:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${schedules?.length || 0} schedules ready for execution`);

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No schedules ready for execution',
          checked: 0,
          executed: 0,
          duration_ms: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Processar cada agendamento
    for (const schedule of schedules as AutomationSchedule[]) {
      console.log(`\n🔄 Processing schedule for client: ${schedule.client_id}`);
      
      const executionId = crypto.randomUUID();
      const execStartTime = Date.now();
      
      try {
        // Create execution log entry with running status
        const { error: logError } = await supabase
          .from('automation_execution_logs' as any)
          .insert({
            company_id: schedule.company_id,
            client_id: schedule.client_id,
            execution_id: executionId,
            status: 'running',
            actions_taken: 0,
            total_rules_evaluated: 0,
            started_at: new Date().toISOString(),
          });

        if (logError) {
          console.error(`⚠️ Error creating execution log:`, logError);
        }
        
        // Invocar execute-campaign-automations para este cliente
        const { data: execData, error: execError } = await supabase.functions.invoke(
          'execute-campaign-automations',
          {
            body: { client_id: schedule.client_id }
          }
        );

        const execDuration = Date.now() - execStartTime;

        if (execError) {
          console.error(`❌ Error executing automations for client ${schedule.client_id}:`, execError);
          errorCount++;
          
          // Update log with error status
          await supabase
            .from('automation_execution_logs' as any)
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: execDuration,
              error_message: execError.message || 'Unknown error',
            })
            .eq('execution_id', executionId);
          
          results.push({
            client_id: schedule.client_id,
            success: false,
            error: execError.message
          });
          continue;
        }

        console.log(`✅ Automations executed for client ${schedule.client_id}:`, execData);

        // Update log with success status
        await supabase
          .from('automation_execution_logs' as any)
          .update({
            status: execData?.totalErrors > 0 
              ? (execData?.totalActioned > 0 ? 'partial' : 'failed')
              : 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: execDuration,
            actions_taken: execData?.totalActioned || 0,
            total_rules_evaluated: (execData?.totalProcessed || 0) + (execData?.totalSkipped || 0),
            execution_details: execData || {},
          })
          .eq('execution_id', executionId);

        // Calcular próximo next_execution_at
        const nextExecution = calculateNextExecution(schedule.scheduled_times);
        console.log(`⏰ Next execution calculated: ${nextExecution.toISOString()}`);

        // Atualizar registro
        const { error: updateError } = await supabase
          .from('automation_schedules')
          .update({
            last_execution_at: new Date().toISOString(),
            next_execution_at: nextExecution.toISOString()
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`⚠️ Error updating schedule for client ${schedule.client_id}:`, updateError);
        }

        successCount++;
        results.push({
          client_id: schedule.client_id,
          success: true,
          actions_taken: execData?.actionsTaken || 0,
          next_execution_at: nextExecution.toISOString()
        });

      } catch (error) {
        console.error(`❌ Exception processing client ${schedule.client_id}:`, error);
        errorCount++;
        
        const execDuration = Date.now() - execStartTime;
        
        // Update log with error status
        await supabase
          .from('automation_execution_logs' as any)
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: execDuration,
            error_message: error.message || 'Unknown error',
          })
          .eq('execution_id', executionId);
        
        results.push({
          client_id: schedule.client_id,
          success: false,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✨ Master Scheduler completed in ${duration}ms`);
    console.log(`📊 Results: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: schedules.length,
        executed: successCount,
        errors: errorCount,
        duration_ms: duration,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in master-automation-scheduler:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        duration_ms: Date.now() - startTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});