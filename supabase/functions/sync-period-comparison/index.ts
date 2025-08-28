import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { comparisonId } = await req.json();

    if (!comparisonId) {
      throw new Error('comparisonId is required');
    }

    console.log('Starting period comparison sync for:', comparisonId);

    // Get comparison details
    const { data: comparison, error: comparisonError } = await supabase
      .from('period_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single();

    if (comparisonError || !comparison) {
      throw new Error('Comparison not found');
    }

    // Update status to syncing
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'syncing',
        sync_progress: 0,
        error_message: null
      })
      .eq('id', comparisonId);

    // Get client details and Facebook integration
    const { data: client } = await supabase
      .from('clients')
      .select(`
        *,
        facebook_ad_accounts (
          account_id,
          integration:facebook_integrations (
            access_token,
            expires_at
          )
        )
      `)
      .eq('id', comparison.client_id)
      .single();

    if (!client?.facebook_ad_accounts?.[0]?.integration?.access_token) {
      throw new Error('Facebook integration not found or expired');
    }

    const accessToken = client.facebook_ad_accounts[0].integration.access_token;
    const adAccountId = client.facebook_ad_accounts[0].account_id;

    console.log('Syncing data for periods:', comparison.period_1_start, 'to', comparison.period_1_end, 'and', comparison.period_2_start, 'to', comparison.period_2_end);

    // Function to convert Facebook actions to conversions count
    const countConversionsFromActions = (actions: any[]) => {
      if (!actions || !Array.isArray(actions)) return 0;

      const leadActions = actions.filter(action => 
        action.action_type && (
          action.action_type.includes('lead') ||
          action.action_type === 'complete_registration' ||
          action.action_type === 'submit_application' ||
          action.action_type === 'contact' ||
          action.action_type === 'find_location' ||
          action.action_type === 'schedule' ||
          action.action_type === 'start_trial' ||
          action.action_type === 'subscribe'
        )
      );

      return leadActions.reduce((total, action) => {
        return total + (parseInt(action.value) || 0);
      }, 0);
    };

    // Function to sync data for a specific period
    const syncPeriodData = async (periodNumber: number, startDate: string, endDate: string) => {
      console.log(`Syncing period ${periodNumber}: ${startDate} to ${endDate}`);
      
      const timeRange = `{'since':'${startDate}','until':'${endDate}'}`;
      
      // Sync campaigns for this period
      let campaignsUrl = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,insights.time_range(${timeRange}){spend,impressions,clicks,actions,conversions,reach,frequency,ctr,cpc,cpa,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`;
      
      let allCampaigns = [];
      
      while (campaignsUrl) {
        console.log(`Fetching campaigns from: ${campaignsUrl.substring(0, 100)}...`);
        
        const campaignsResponse = await fetch(campaignsUrl);
        const campaignsData = await campaignsResponse.json();
        
        if (campaignsData.error) {
          console.error('Facebook API error:', campaignsData.error);
          throw new Error(`Facebook API error: ${campaignsData.error.message}`);
        }
        
        if (campaignsData.data) {
          allCampaigns.push(...campaignsData.data);
        }
        
        campaignsUrl = campaignsData.paging?.next || null;
        
        // Update progress
        await supabase
          .from('period_comparisons')
          .update({ sync_progress: Math.floor((periodNumber - 1) * 50 + (allCampaigns.length * 25)) })
          .eq('id', comparisonId);
      }
      
      console.log(`Found ${allCampaigns.length} campaigns for period ${periodNumber}`);
      
      // Process and save campaigns data
      for (const campaign of allCampaigns) {
        const insights = campaign.insights?.data?.[0];
        
        if (insights) {
          const conversions = countConversionsFromActions(insights.actions);
          
          await supabase
            .from('period_comparison_campaigns')
            .insert({
              comparison_id: comparisonId,
              period_number: periodNumber,
              facebook_campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              spend: parseFloat(insights.spend) || 0,
              impressions: parseInt(insights.impressions) || 0,
              clicks: parseInt(insights.clicks) || 0,
              conversions: conversions,
              reach: parseInt(insights.reach) || 0,
              frequency: parseFloat(insights.frequency) || 0,
              ctr: parseFloat(insights.ctr) || 0,
              cpc: parseFloat(insights.cpc) || 0,
              cpa: parseFloat(insights.cpa) || 0,
              quality_ranking: insights.quality_ranking,
              engagement_rate_ranking: insights.engagement_rate_ranking,
              conversion_rate_ranking: insights.conversion_rate_ranking
            });
        }
      }
      
      // Sync ad sets for this period
      let adsetsUrl = `https://graph.facebook.com/v19.0/act_${adAccountId}/adsets?fields=id,name,campaign_id,status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,targeting,insights.time_range(${timeRange}){spend,impressions,clicks,actions,conversions,reach,frequency,ctr,cpc,cpa}&access_token=${accessToken}`;
      
      let allAdSets = [];
      
      while (adsetsUrl) {
        const adsetsResponse = await fetch(adsetsUrl);
        const adsetsData = await adsetsResponse.json();
        
        if (adsetsData.error) {
          console.error('Facebook API error for adsets:', adsetsData.error);
          break;
        }
        
        if (adsetsData.data) {
          allAdSets.push(...adsetsData.data);
        }
        
        adsetsUrl = adsetsData.paging?.next || null;
      }
      
      console.log(`Found ${allAdSets.length} ad sets for period ${periodNumber}`);
      
      // Process and save ad sets data
      for (const adset of allAdSets) {
        const insights = adset.insights?.data?.[0];
        
        if (insights) {
          const conversions = countConversionsFromActions(insights.actions);
          
          await supabase
            .from('period_comparison_adsets')
            .insert({
              comparison_id: comparisonId,
              period_number: periodNumber,
              facebook_adset_id: adset.id,
              facebook_campaign_id: adset.campaign_id,
              adset_name: adset.name,
              status: adset.status,
              daily_budget: parseFloat(adset.daily_budget) || 0,
              lifetime_budget: parseFloat(adset.lifetime_budget) || 0,
              bid_strategy: adset.bid_strategy,
              optimization_goal: adset.optimization_goal,
              targeting: JSON.stringify(adset.targeting),
              spend: parseFloat(insights.spend) || 0,
              impressions: parseInt(insights.impressions) || 0,
              clicks: parseInt(insights.clicks) || 0,
              conversions: conversions,
              reach: parseInt(insights.reach) || 0,
              frequency: parseFloat(insights.frequency) || 0,
              ctr: parseFloat(insights.ctr) || 0,
              cpc: parseFloat(insights.cpc) || 0,
              cpa: parseFloat(insights.cpa) || 0
            });
        }
      }
    };

    // Sync both periods
    await syncPeriodData(1, comparison.period_1_start, comparison.period_1_end);
    await syncPeriodData(2, comparison.period_2_start, comparison.period_2_end);

    // Mark comparison as completed
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'completed',
        sync_progress: 100
      })
      .eq('id', comparisonId);

    console.log('Period comparison sync completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-period-comparison:', error);
    
    // Update comparison with error status if we have comparisonId
    const { comparisonId } = await req.json().catch(() => ({}));
    if (comparisonId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase
        .from('period_comparisons')
        .update({ 
          status: 'error',
          error_message: error.message
        })
        .eq('id', comparisonId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});