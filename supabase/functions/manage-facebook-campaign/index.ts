import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    const { campaignId, status, clientId } = await req.json();
    
    if (!campaignId || !status || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: campaignId, status, clientId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Managing Facebook campaign ${campaignId} - Setting status to: ${status}`);

    // Get client and integration data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('ad_account_id, company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client?.ad_account_id) {
      console.error('Client not found or missing ad_account_id:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found or missing ad account ID' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, expires_at')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error('Facebook integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Facebook integration not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if token is expired
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Facebook access token has expired. Please reconnect your Facebook account.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert status to Facebook API format
    const facebookStatus = status === 'active' ? 'ACTIVE' : 'PAUSED';
    
    // Update campaign status via Facebook API
    const facebookUrl = `https://graph.facebook.com/v20.0/${campaignId}`;
    const facebookResponse = await fetch(facebookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: facebookStatus,
        access_token: integration.access_token,
      }),
    });

    if (!facebookResponse.ok) {
      const errorData = await facebookResponse.json();
      console.error('Facebook API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update campaign on Facebook', 
          details: errorData.error?.message || 'Unknown Facebook API error' 
        }),
        { 
          status: facebookResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const facebookResult = await facebookResponse.json();
    console.log('Facebook API response:', facebookResult);

    // Update local database to sync with Facebook
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status,
        is_active: status === 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating local campaign:', updateError);
      // Facebook was updated successfully, but local sync failed
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Campaign updated on Facebook but local sync failed. Please refresh to see changes.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign ${status === 'active' ? 'activated' : 'paused'} successfully on Facebook` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in manage-facebook-campaign:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});