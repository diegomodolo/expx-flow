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

    console.log('[daily-ad-generator-scheduler] Starting scheduled check...');

    // Get current hour in BRT (UTC-3)
    const now = new Date();
    const brtHour = (now.getUTCHours() - 3 + 24) % 24;
    const currentHour = brtHour.toString().padStart(2, '0') + ':00';
    
    console.log('[daily-ad-generator-scheduler] Current BRT hour:', currentHour);

    // Fetch all active schedules that should run at this hour
    const { data: schedules, error: schedulesError } = await supabase
      .from('ad_generation_schedules')
      .select('*, clients!inner(id, name, user_id)')
      .eq('is_active', true);

    if (schedulesError) {
      console.error('[daily-ad-generator-scheduler] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log('[daily-ad-generator-scheduler] Found', schedules?.length || 0, 'active schedules');

    const results: any[] = [];

    for (const schedule of schedules || []) {
      // Check if current hour matches generation_time
      const scheduleHour = schedule.generation_time?.substring(0, 5) || '08:00';
      
      if (scheduleHour !== currentHour) {
        console.log(`[daily-ad-generator-scheduler] Skipping ${schedule.client_id} - scheduled for ${scheduleHour}, current is ${currentHour}`);
        continue;
      }

      // Check if already ran today
      const lastRun = schedule.last_generation_at ? new Date(schedule.last_generation_at) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (lastRun && lastRun >= today) {
        console.log(`[daily-ad-generator-scheduler] Skipping ${schedule.client_id} - already ran today at ${lastRun.toISOString()}`);
        continue;
      }

      console.log(`[daily-ad-generator-scheduler] Triggering generation for client ${schedule.clients?.name} (${schedule.client_id})`);

      try {
        // Call the daily-ad-generator function
        const response = await fetch(`${supabaseUrl}/functions/v1/daily-ad-generator`, {
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
        });

        const result = await response.json();
        
        results.push({
          client_id: schedule.client_id,
          client_name: schedule.clients?.name,
          success: response.ok,
          result,
        });

        console.log(`[daily-ad-generator-scheduler] Result for ${schedule.clients?.name}:`, result);
      } catch (error) {
        console.error(`[daily-ad-generator-scheduler] Error for client ${schedule.client_id}:`, error);
        results.push({
          client_id: schedule.client_id,
          client_name: schedule.clients?.name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log('[daily-ad-generator-scheduler] Completed. Processed:', results.length, 'clients');

    return new Response(
      JSON.stringify({
        success: true,
        current_hour: currentHour,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[daily-ad-generator-scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
