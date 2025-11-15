import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncOptions {
  period: string;
  campaigns: boolean;
  adsets: boolean;
  ads: boolean;
  includeInactive: boolean;
}

function calculateScheduledTimes(executionsPerDay: number): string[] {
  const times: string[] = [];
  const intervalMinutes = Math.floor((24 * 60) / executionsPerDay);
  
  for (let i = 0; i < executionsPerDay; i++) {
    const totalMinutes = i * intervalMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    times.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  }
  
  return times;
}

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
  
  // Se todos os horários de hoje já passaram, retornar o primeiro horário de amanhã
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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client to verify JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    console.log('Auth check:', { user: user?.id, error: userError?.message });
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, company_id, is_enabled, sync_options, executions_per_day } = body;

    // GET - Buscar schedule
    if (action === 'get') {
      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: schedule, error } = await supabase
        .from('facebook_sync_schedules')
        .select('*')
        .eq('company_id', company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return new Response(JSON.stringify({ schedule: schedule || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CREATE/UPDATE - Criar ou atualizar schedule
    if (action === 'upsert') {

      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const scheduledTimes = calculateScheduledTimes(executions_per_day || 1);
      const nextExecutionAt = is_enabled ? calculateNextExecution(scheduledTimes) : null;

      const scheduleData = {
        company_id,
        is_enabled: is_enabled ?? false,
        sync_options: sync_options || {
          period: '30',
          campaigns: true,
          adsets: true,
          ads: true,
          includeInactive: false,
        },
        executions_per_day: executions_per_day || 1,
        scheduled_times: scheduledTimes,
        next_execution_at: nextExecutionAt?.toISOString(),
      };

      const { data: schedule, error } = await supabase
        .from('facebook_sync_schedules')
        .upsert(scheduleData, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ schedule }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Atualizar campos específicos
    if (action === 'patch') {
      const updates = { ...body };
      delete updates.action;
      delete updates.company_id;

      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Se está habilitando/desabilitando, recalcular next_execution_at
      if ('is_enabled' in updates) {
        const { data: currentSchedule } = await supabase
          .from('facebook_sync_schedules')
          .select('scheduled_times')
          .eq('company_id', company_id)
          .single();

        if (currentSchedule && updates.is_enabled) {
          updates.next_execution_at = calculateNextExecution(currentSchedule.scheduled_times).toISOString();
        } else if (!updates.is_enabled) {
          updates.next_execution_at = null;
        }
      }

      const { data: schedule, error } = await supabase
        .from('facebook_sync_schedules')
        .update(updates)
        .eq('company_id', company_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ schedule }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Remover schedule
    if (action === 'delete') {
      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('facebook_sync_schedules')
        .delete()
        .eq('company_id', company_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manage-facebook-sync-schedule:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
