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

    console.log('[autopilot-publisher] Starting autopilot check...');

    // Fetch all active autopilot schedules with advanced config
    const { data: schedules, error: schedulesError } = await supabase
      .from('ad_generation_schedules')
      .select('*')
      .eq('is_active', true)
      .eq('autopilot_enabled', true);

    if (schedulesError) {
      console.error('[autopilot-publisher] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log('[autopilot-publisher] Found', schedules?.length || 0, 'active autopilot schedules');

    const results: any[] = [];

    for (const schedule of schedules || []) {
      // Score is now 0-10, no need to divide by 100
      const minQualityScore = schedule.autopilot_min_quality_score ?? 7.5;
      const targetCampaignId = schedule.target_campaign_id;
      const targetAdsetId = schedule.target_adset_id;

      console.log('[autopilot-publisher] Processing client:', schedule.client_id, 'Min score:', minQualityScore, 'Target campaign:', targetCampaignId);

      // Check if target campaign/adset is configured
      if (!targetCampaignId) {
        console.log('[autopilot-publisher] No target campaign configured for client:', schedule.client_id);
        results.push({
          client_id: schedule.client_id,
          published: 0,
          reason: 'No target campaign configured in factory settings',
        });
        continue;
      }

      // Fetch approved ads with high quality score that haven't been published
      // Score is now 0-10, compare directly
      const { data: eligibleAds, error: adsError } = await supabase
        .from('ad_generation_queue')
        .select('*')
        .eq('client_id', schedule.client_id)
        .eq('status', 'approved')
        .gte('quality_score', minQualityScore)
        .is('published_at', null);

      if (adsError) {
        console.error('[autopilot-publisher] Error fetching ads:', adsError);
        continue;
      }

      console.log('[autopilot-publisher] Found', eligibleAds?.length || 0, 'eligible ads with score >=', minQualityScore);

      if (!eligibleAds || eligibleAds.length === 0) {
        results.push({
          client_id: schedule.client_id,
          published: 0,
          reason: 'No eligible ads found',
        });
        continue;
      }

      // Publish all eligible ads (no budget limit needed)
      const adsToPublish = eligibleAds.length;

      console.log('[autopilot-publisher] Will publish', adsToPublish, 'ads to campaign:', targetCampaignId);

      // Get client Meta credentials
      const { data: client } = await supabase
        .from('clients')
        .select('ad_account_id, facebook_page_id')
        .eq('id', schedule.client_id)
        .single();

      if (!client?.ad_account_id) {
        console.log('[autopilot-publisher] No ad account configured for client');
        results.push({
          client_id: schedule.client_id,
          published: 0,
          reason: 'No ad account configured',
        });
        continue;
      }

      // Get target campaign and adset facebook IDs
      let targetCampaignFbId = null;
      let targetAdsetFbId = null;

      if (targetCampaignId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('facebook_id')
          .eq('id', targetCampaignId)
          .single();
        targetCampaignFbId = campaign?.facebook_id;
      }

      if (targetAdsetId) {
        const { data: adset } = await supabase
          .from('ad_sets')
          .select('facebook_id')
          .eq('id', targetAdsetId)
          .single();
        targetAdsetFbId = adset?.facebook_id;
      }

      console.log('[autopilot-publisher] Target FB IDs - Campaign:', targetCampaignFbId, 'AdSet:', targetAdsetFbId);

      // Publish ads to Meta
      let publishedCount = 0;
      const adsToProcess = eligibleAds.slice(0, adsToPublish);

      for (const ad of adsToProcess) {
        try {
          // TODO: Here we would call Meta API to publish with targetCampaignFbId and targetAdsetFbId
          // For now, we just mark as published
          const { error: updateError } = await supabase
            .from('ad_generation_queue')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('id', ad.id);

          if (!updateError) {
            publishedCount++;
            console.log('[autopilot-publisher] Published ad:', ad.id, 'to campaign:', targetCampaignFbId);
          }
        } catch (error) {
          console.error('[autopilot-publisher] Error publishing ad:', error);
        }
      }

      results.push({
        client_id: schedule.client_id,
        published: publishedCount,
        eligible: eligibleAds.length,
        min_quality_score: minQualityScore,
        target_campaign_id: targetCampaignId,
        target_adset_id: targetAdsetId,
      });
    }

    console.log('[autopilot-publisher] Completed. Results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        processed: schedules?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[autopilot-publisher] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
