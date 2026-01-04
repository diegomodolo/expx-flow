import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[carousel-scheduler] Starting scheduled carousel generation check...');

    // Get all active schedules that need generation
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Convert to BRT (UTC-3)
    const brtHour = (currentHour - 3 + 24) % 24;
    const currentTimeStr = `${String(brtHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    console.log('[carousel-scheduler] Current time (BRT):', currentTimeStr);

    const { data: schedules, error: schedulesError } = await supabase
      .from('carousel_generation_schedules')
      .select('*, clients!carousel_generation_schedules_client_id_fkey(name)')
      .eq('is_active', true);

    if (schedulesError) {
      console.error('[carousel-scheduler] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log('[carousel-scheduler] Found', schedules?.length || 0, 'active schedules');

    const results: any[] = [];

    for (const schedule of schedules || []) {
      const scheduleTime = schedule.generation_time;
      const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

      // Check if it's time to generate (within 30 minute window)
      const timeDiff = Math.abs(
        (brtHour * 60 + currentMinute) - (scheduleHour * 60 + scheduleMinute)
      );

      if (timeDiff > 30) {
        console.log(`[carousel-scheduler] Skipping ${schedule.clients?.name || schedule.client_id}: not in time window (${scheduleTime})`);
        continue;
      }

      // Check if already generated today
      if (schedule.last_generation_at) {
        const lastGen = new Date(schedule.last_generation_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastGen.setHours(0, 0, 0, 0);

        if (lastGen.getTime() === today.getTime()) {
          console.log(`[carousel-scheduler] Skipping ${schedule.clients?.name || schedule.client_id}: already generated today`);
          continue;
        }
      }

      console.log(`[carousel-scheduler] Triggering generation for ${schedule.clients?.name || schedule.client_id}`);

      // Call the generator function
      try {
        const response = await supabase.functions.invoke('daily-carousel-generator', {
          body: {
            client_id: schedule.client_id,
            company_id: schedule.company_id,
            user_id: null, // System generated
          },
        });

        if (response.error) {
          console.error(`[carousel-scheduler] Error generating for ${schedule.client_id}:`, response.error);
          results.push({
            client_id: schedule.client_id,
            success: false,
            error: response.error.message,
          });
        } else {
          console.log(`[carousel-scheduler] Generation completed for ${schedule.client_id}:`, response.data);
          results.push({
            client_id: schedule.client_id,
            success: true,
            generated: response.data?.generated || 0,
          });
        }
      } catch (invokeError: any) {
        console.error(`[carousel-scheduler] Invoke error for ${schedule.client_id}:`, invokeError);
        results.push({
          client_id: schedule.client_id,
          success: false,
          error: invokeError.message,
        });
      }
    }

    console.log('[carousel-scheduler] Scheduler completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[carousel-scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
