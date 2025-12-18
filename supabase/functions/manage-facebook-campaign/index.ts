// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaignId: string;
  clientId: string;
  action?: 'toggle' | 'rename' | 'budget' | 'duplicate';
  status?: string;
  name?: string;
  budgetType?: 'daily' | 'lifetime';
  amount?: number;
  newName?: string;
}

Deno.serve(async (req) => {
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

    const body: RequestBody = await req.json();
    const { campaignId, clientId, action = 'toggle', status, name, budgetType, amount, newName } = body;
    
    if (!campaignId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: campaignId, clientId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Managing Facebook campaign ${campaignId} - Action: ${action}`);

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

    // Get the campaign's facebook_id
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('facebook_id')
      .eq('id', campaignId)
      .single();

    const facebookCampaignId = campaign?.facebook_id || campaignId;

    let facebookResponse: Response;
    let updateData: Record<string, any> = {};
    let successMessage = '';

    switch (action) {
      case 'toggle': {
        if (!status) {
          return new Response(
            JSON.stringify({ error: 'Missing status parameter for toggle action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const facebookStatus = status === 'active' ? 'ACTIVE' : 'PAUSED';
        
        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookCampaignId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: facebookStatus,
            access_token: integration.access_token,
          }),
        });

        updateData = { 
          status,
          is_active: status === 'active',
          updated_at: new Date().toISOString()
        };
        successMessage = `Campaign ${status === 'active' ? 'activated' : 'paused'} successfully`;
        break;
      }

      case 'rename': {
        if (!name) {
          return new Response(
            JSON.stringify({ error: 'Missing name parameter for rename action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookCampaignId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            access_token: integration.access_token,
          }),
        });

        updateData = { 
          name,
          updated_at: new Date().toISOString()
        };
        successMessage = 'Campaign renamed successfully';
        break;
      }

      case 'budget': {
        if (!budgetType || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing budgetType or amount for budget action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const budgetField = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
        
        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookCampaignId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [budgetField]: amount, // amount already in cents
            access_token: integration.access_token,
          }),
        });

        successMessage = 'Budget updated successfully';
        break;
      }

      case 'duplicate': {
        // Facebook API for campaign duplication
        const duplicateName = newName || `Copy of campaign`;
        
        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookCampaignId}/copies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deep_copy: true,
            rename_options: {
              rename_strategy: 'DEEP_RENAME',
              rename_prefix: '',
              rename_suffix: ' - Cópia',
            },
            access_token: integration.access_token,
          }),
        });

        successMessage = 'Campaign duplicated successfully';
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

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

    // Update local database to sync with Facebook (for toggle and rename)
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error updating local campaign:', updateError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Campaign updated on Facebook but local sync failed. Please refresh to see changes.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage,
        data: facebookResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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