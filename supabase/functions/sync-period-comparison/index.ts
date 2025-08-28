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
      .select(`
        id,
        name,
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
      console.error('Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    if (!client) {
      throw new Error('Client not found');
    }

    console.log('Client found:', client.name);

    const adAccount = client.facebook_ad_accounts?.[0];
    
    // Update progress
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 30 })
      .eq('id', comparisonId);

    if (!adAccount?.integration?.access_token) {
      console.log('No Facebook integration found for this client, marking as completed without sync');
      
      // Mark as completed without Facebook sync
      await supabase
        .from('period_comparisons')
        .update({ 
          status: 'completed',
          sync_progress: 100,
          error_message: 'Concluído sem sincronização do Facebook (integração não configurada)'
        })
        .eq('id', comparisonId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Comparison created successfully (no Facebook integration)',
          comparisonId: comparisonId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const accessToken = adAccount.integration.access_token;
    const adAccountId = adAccount.account_id;
    
    console.log('Facebook integration found, account ID:', adAccountId);

    // Update progress for Facebook sync
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 50 })
      .eq('id', comparisonId);

    // Simplified sync process for testing
    console.log('Starting simplified sync process...');
    
    // For now, just mark as completed to test the flow
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'completed',
        sync_progress: 100
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