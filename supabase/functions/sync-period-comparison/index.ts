import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody;
  let comparisonId;

  try {
    // Parse request body once
    requestBody = await req.json();
    comparisonId = requestBody.comparisonId;

    if (!comparisonId) {
      throw new Error('comparisonId is required');
    }

    console.log('Starting period comparison sync for:', comparisonId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get comparison details
    console.log('Fetching comparison details...');
    const { data: comparison, error: comparisonError } = await supabase
      .from('period_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single();

    if (comparisonError || !comparison) {
      console.error('Comparison not found:', comparisonError);
      throw new Error(`Comparison not found: ${comparisonError?.message || 'No data'}`);
    }

    console.log('Comparison found:', comparison.comparison_name);

    // Update status to syncing
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'syncing',
        sync_progress: 10,
        error_message: null
      })
      .eq('id', comparisonId);

    console.log('Updated status to syncing');

    // Get client details and Facebook integration
    console.log('Fetching client and Facebook integration...');
    const { data: client, error: clientError } = await supabase
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

    if (clientError) {
      console.error('Client error:', clientError);
      throw new Error(`Client not found: ${clientError.message}`);
    }

    if (!client?.facebook_ad_accounts?.[0]?.integration?.access_token) {
      console.error('Facebook integration not found for client:', comparison.client_id);
      throw new Error('Facebook integration not found or expired');
    }

    console.log('Client found:', client.name);

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
      
      // Update progress
      await supabase
        .from('period_comparisons')
        .update({ sync_progress: 20 + (periodNumber * 10) })
        .eq('id', comparisonId);
      
      const timeRange = `{'since':'${startDate}','until':'${endDate}'}`;
      
      // Sync campaigns for this period
      let campaignsUrl = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,insights.time_range(${timeRange}){spend,impressions,clicks,actions,conversions,reach,frequency,ctr,cpc,cpa,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`;
      
      let allCampaigns = [];
      let attempts = 0;
      const maxAttempts = 5;
      
      while (campaignsUrl && attempts < maxAttempts) {
        attempts++;
        console.log(`Fetching campaigns (attempt ${attempts}): ${campaignsUrl.substring(0, 100)}...`);
        
        try {
          const campaignsResponse = await fetch(campaignsUrl);
          
          if (!campaignsResponse.ok) {
            throw new Error(`Facebook API returned ${campaignsResponse.status}: ${campaignsResponse.statusText}`);
          }
          
          const campaignsData = await campaignsResponse.json();
          
          if (campaignsData.error) {
            console.error('Facebook API error:', campaignsData.error);
            throw new Error(`Facebook API error: ${campaignsData.error.message || 'Unknown error'}`);
          }
          
          if (campaignsData.data) {
            allCampaigns.push(...campaignsData.data);
          }
          
          campaignsUrl = campaignsData.paging?.next || null;
          
          // Update progress
          await supabase
            .from('period_comparisons')
            .update({ sync_progress: Math.min(90, 30 + (periodNumber * 10) + (allCampaigns.length * 2)) })
            .eq('id', comparisonId);
            
        } catch (fetchError) {
          console.error(`Error fetching campaigns (attempt ${attempts}):`, fetchError);
          if (attempts >= maxAttempts) {
            throw fetchError;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Found ${allCampaigns.length} campaigns for period ${periodNumber}`);
      
      // Process and save campaigns data
      for (const campaign of allCampaigns) {
        const insights = campaign.insights?.data?.[0];
        
        if (insights) {
          const conversions = countConversionsFromActions(insights.actions);
          
          try {
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
          } catch (insertError) {
            console.error('Error inserting campaign data:', insertError);
            // Continue with other campaigns
          }
        } else {
          console.log(`No insights data for campaign: ${campaign.name}`);
        }
      }
    };

    // Sync both periods sequentially
    try {
      await syncPeriodData(1, comparison.period_1_start, comparison.period_1_end);
      await syncPeriodData(2, comparison.period_2_start, comparison.period_2_end);
    } catch (syncError) {
      console.error('Error during period sync:', syncError);
      throw new Error(`Sync error: ${syncError.message}`);
    }

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
      JSON.stringify({ success: true, message: 'Sync completed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-period-comparison:', error);
    
    // Update comparison with error status if we have comparisonId
    if (comparisonId) {
      try {
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
      } catch (updateError) {
        console.error('Failed to update comparison with error status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack || 'No stack trace available'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});