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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[daily-creative-generator-scheduler] Starting scheduled check...');

    // Get current time in BRT (UTC-3)
    const now = new Date();
    const brtHour = (now.getUTCHours() - 3 + 24) % 24;
    const brtMinute = now.getUTCMinutes();
    const currentHourMinute = brtHour.toString().padStart(2, '0') + ':' + brtMinute.toString().padStart(2, '0');
    
    console.log('[daily-creative-generator-scheduler] Current BRT time:', currentHourMinute);

    // Fetch all active schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('creative_generation_schedules')
      .select('*, clients!inner(id, name, user_id)')
      .eq('is_active', true);

    if (schedulesError) {
      console.error('[daily-creative-generator-scheduler] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log('[daily-creative-generator-scheduler] Found', schedules?.length || 0, 'active schedules');

    const results: any[] = [];

    for (const schedule of schedules || []) {
      // Check if current time matches generation_time (compare HH:MM)
      const scheduleTime = schedule.generation_time?.substring(0, 5) || '08:00';
      
      // Check if we're within the 15-minute window
      const [schedHour, schedMin] = scheduleTime.split(':').map(Number);
      const [currHour, currMin] = currentHourMinute.split(':').map(Number);
      
      const schedWindow = Math.floor(schedMin / 15);
      const currWindow = Math.floor(currMin / 15);
      
      if (schedHour !== currHour || schedWindow !== currWindow) {
        console.log(`[daily-creative-generator-scheduler] Skipping ${schedule.client_id} - scheduled for ${scheduleTime}`);
        continue;
      }

      // Check if already ran today (in BRT timezone)
      const lastRun = schedule.last_generation_at ? new Date(schedule.last_generation_at) : null;
      
      const nowUTC = new Date();
      const todayBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
      todayBRT.setUTCHours(0, 0, 0, 0);
      
      if (lastRun) {
        const lastRunBRT = new Date(lastRun.getTime() - 3 * 60 * 60 * 1000);
        lastRunBRT.setUTCHours(0, 0, 0, 0);
        
        if (lastRunBRT.getTime() >= todayBRT.getTime()) {
          console.log(`[daily-creative-generator-scheduler] Skipping ${schedule.client_id} - already ran today`);
          continue;
        }
      }

      console.log(`[daily-creative-generator-scheduler] Triggering for ${schedule.clients?.name}`);

      try {
        // Update last_generation_at BEFORE triggering to prevent duplicates
        await supabase
          .from('creative_generation_schedules')
          .update({ last_generation_at: new Date().toISOString() })
          .eq('id', schedule.id);

        // Fire-and-forget
        fetch(`${supabaseUrl}/functions/v1/daily-creative-generator`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: schedule.client_id,
            company_id: schedule.company_id,
            user_id: schedule.clients?.user_id,
          }),
        }).catch(err => {
          console.error(`[daily-creative-generator-scheduler] Background request error:`, err);
        });

        results.push({
          client_id: schedule.client_id,
          client_name: schedule.clients?.name,
          triggered: true,
        });

      } catch (error: any) {
        console.error(`[daily-creative-generator-scheduler] Error for ${schedule.client_id}:`, error);
        results.push({
          client_id: schedule.client_id,
          triggered: false,
          error: error.message,
        });
      }
    }

    console.log('[daily-creative-generator-scheduler] Completed. Triggered:', results.length);

    return new Response(
      JSON.stringify({
        success: true,
        current_time: currentHourMinute,
        triggered: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[daily-creative-generator-scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
