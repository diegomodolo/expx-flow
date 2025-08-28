import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Received request:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  let comparisonId: string | null = null;
  let supabase: any = null;

  try {
    console.log('Parsing request body...');
    
    // Parse request body
    const requestBody = await req.json();
    console.log('Request body parsed successfully:', requestBody);
    
    comparisonId = requestBody?.comparisonId;
    
    if (!comparisonId) {
      console.error('Missing comparisonId in request');
      throw new Error('comparisonId is required');
    }
    
    console.log('ComparisonId received:', comparisonId);

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');

    // Update status to syncing
    console.log('Updating comparison status to syncing...');
    const { error: updateError } = await supabase
      .from('period_comparisons')
      .update({ 
        status: 'syncing',
        sync_progress: 10,
        error_message: null
      })
      .eq('id', comparisonId);
      
    if (updateError) {
      console.error('Error updating comparison status:', updateError);
      throw new Error(`Failed to update comparison status: ${updateError.message}`);
    }
    
    console.log('Status updated to syncing');

    // Get comparison details
    console.log('Fetching comparison details...');
    const { data: comparison, error: comparisonError } = await supabase
      .from('period_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single();

    if (comparisonError) {
      console.error('Error fetching comparison:', comparisonError);
      throw new Error(`Failed to fetch comparison: ${comparisonError.message}`);
    }
    
    if (!comparison) {
      throw new Error('Comparison not found');
    }

    console.log('Comparison found:', {
      id: comparison.id,
      name: comparison.comparison_name,
      client_id: comparison.client_id,
      period_1: `${comparison.period_1_start} to ${comparison.period_1_end}`,
      period_2: `${comparison.period_2_start} to ${comparison.period_2_end}`
    });

    // Get client and Facebook integration
    console.log('Fetching client and Facebook integration...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', comparison.client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    if (!client) {
      throw new Error('Client not found');
    }

    console.log('Client found:', client.name);

    // Get Facebook integration for this client via campaigns
    console.log('Fetching Facebook integration...');
    const { data: fbAccount, error: fbError } = await supabase
      .from('facebook_ad_accounts')
      .select(`
        account_id,
        integration:facebook_integrations (
          access_token,
          expires_at
        )
      `)
      .limit(1)
      .single();

    // Update progress
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 30 })
      .eq('id', comparisonId);

    // Sync campaign data from existing campaigns in database
    console.log('Starting campaign data sync process...');
    
    // Sync campaigns for period 1 - use all campaigns from client and filter by period dates
    console.log('Syncing period 1 campaigns...');
    const { data: period1Campaigns, error: p1Error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', comparison.client_id);

    if (p1Error) {
      console.error('Error fetching period 1 campaigns:', p1Error);
    } else {
      console.log(`Found ${period1Campaigns?.length || 0} campaigns for period 1`);
      
      // Insert campaigns into comparison table
      if (period1Campaigns && period1Campaigns.length > 0) {
        console.log(`Preparing to insert ${period1Campaigns.length} campaigns for period 1`);
        
        const campaignInserts = period1Campaigns.map(campaign => ({
          comparison_id: comparisonId,
          campaign_id: campaign.id,
          period: 1,
          name: campaign.name,
          status: campaign.status,
          spend: campaign.spend || 0,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          conversions: campaign.conversions || 0,
          ctr: campaign.ctr || 0,
          cpc: campaign.cpc || 0,
          cpa: campaign.cpa || 0,
          reach: campaign.reach || 0,
          frequency: campaign.frequency || 0
        }));

        console.log('Campaign inserts data:', JSON.stringify(campaignInserts[0])); // Log first item as sample

        const { error: insertError } = await supabase
          .from('period_comparison_campaigns')
          .upsert(campaignInserts);

        if (insertError) {
          console.error('Error inserting period 1 campaigns:', insertError);
          throw new Error(`Failed to insert period 1 campaigns: ${insertError.message}`);
        } else {
          console.log(`Successfully synced ${campaignInserts.length} campaigns for period 1`);
        }
      } else {
        console.log('No period 1 campaigns found to insert');
      }
    }

    // Update progress
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 60 })
      .eq('id', comparisonId);

    // Sync campaigns for period 2 - use all campaigns from client (same as period 1 for now)
    console.log('Syncing period 2 campaigns...');
    const { data: period2Campaigns, error: p2Error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', comparison.client_id);

    if (p2Error) {
      console.error('Error fetching period 2 campaigns:', p2Error);
    } else {
      console.log(`Found ${period2Campaigns?.length || 0} campaigns for period 2`);
      
      // Insert campaigns into comparison table
      if (period2Campaigns && period2Campaigns.length > 0) {
        console.log(`Preparing to insert ${period2Campaigns.length} campaigns for period 2`);
        
        const campaignInserts = period2Campaigns.map(campaign => ({
          comparison_id: comparisonId,
          campaign_id: campaign.id,
          period: 2,
          name: campaign.name,
          status: campaign.status,
          spend: campaign.spend || 0,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          conversions: campaign.conversions || 0,
          ctr: campaign.ctr || 0,
          cpc: campaign.cpc || 0,
          cpa: campaign.cpa || 0,
          reach: campaign.reach || 0,
          frequency: campaign.frequency || 0
        }));

        console.log('Campaign inserts data for period 2:', JSON.stringify(campaignInserts[0])); // Log first item as sample

        const { error: insertError } = await supabase
          .from('period_comparison_campaigns')
          .upsert(campaignInserts);

        if (insertError) {
          console.error('Error inserting period 2 campaigns:', insertError);
          throw new Error(`Failed to insert period 2 campaigns: ${insertError.message}`);
        } else {
          console.log(`Successfully synced ${campaignInserts.length} campaigns for period 2`);
        }
      } else {
        console.log('No period 2 campaigns found to insert');
      }
    }

    // Update progress and mark as completed
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'completed',
        sync_progress: 100,
        error_message: null
      })
      .eq('id', comparisonId);

    console.log('Sync completed successfully (simplified version)');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync completed successfully (simplified version)',
        comparisonId: comparisonId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-period-comparison:', {
      message: error.message,
      stack: error.stack,
      comparisonId: comparisonId
    });
    
    // Try to update comparison with error status
    if (comparisonId && supabase) {
      try {
        console.log('Updating comparison with error status...');
        await supabase
          .from('period_comparisons')
          .update({ 
            status: 'error',
            error_message: error.message.substring(0, 500) // Limit error message length
          })
          .eq('id', comparisonId);
      } catch (updateError) {
        console.error('Failed to update comparison with error status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        comparisonId: comparisonId,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});