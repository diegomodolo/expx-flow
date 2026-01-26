// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  // New format (from useInlineEdit)
  client_id?: string;
  facebook_id?: string;
  entity_type?: 'campaign' | 'adset' | 'ad';
  action?: 'toggle' | 'rename' | 'budget' | 'duplicate';
  status?: string;
  new_name?: string;
  budget_type?: 'daily' | 'lifetime';
  budget_amount?: number;
  
  // Legacy format (for backward compatibility)
  campaignId?: string;
  clientId?: string;
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
    
    // Support both new and legacy parameter formats
    const clientId = body.client_id || body.clientId;
    const facebookId = body.facebook_id || body.campaignId;
    const entityType = body.entity_type || 'campaign';
    const action = body.action || 'toggle';
    const status = body.status;
    const newName = body.new_name || body.name || body.newName;
    const budgetType = body.budget_type || body.budgetType;
    const budgetAmount = body.budget_amount || body.amount;
    
    console.log('Received request:', { clientId, facebookId, entityType, action, status });
    
    if (!facebookId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: campaignId, clientId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Managing ${entityType} ${facebookId} - Action: ${action}`);

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

    let facebookResponse: Response;
    let successMessage = '';

    switch (action) {
      case 'toggle': {
        if (!status) {
          return new Response(
            JSON.stringify({ error: 'Missing status parameter for toggle action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Accept both formats: "ACTIVE"/"PAUSED" or "active"/"paused"
        const facebookStatus = status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
        
        console.log(`Toggling ${entityType} ${facebookId} to ${facebookStatus}`);
        
        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: facebookStatus,
            access_token: integration.access_token,
          }),
        });

        successMessage = `${entityType} ${facebookStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`;
        break;
      }

      case 'rename': {
        if (!newName) {
          return new Response(
            JSON.stringify({ error: 'Missing name parameter for rename action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Renaming ${entityType} ${facebookId} to ${newName}`);

        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName,
            access_token: integration.access_token,
          }),
        });

        successMessage = `${entityType} renamed successfully`;
        break;
      }

      case 'budget': {
        if (!budgetType || !budgetAmount) {
          return new Response(
            JSON.stringify({ error: 'Missing budgetType or amount for budget action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const budgetField = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
        // Convert to cents (Meta expects cents)
        const amountInCents = Math.round(budgetAmount * 100);
        
        console.log(`Updating ${entityType} ${facebookId} budget: ${budgetField} = ${amountInCents} cents`);
        
        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [budgetField]: amountInCents,
            access_token: integration.access_token,
          }),
        });

        successMessage = 'Budget updated successfully';
        break;
      }

      case 'duplicate': {
        // Facebook API for entity duplication
        const duplicateName = newName || `Copy of ${entityType}`;
        
        console.log(`Duplicating ${entityType} ${facebookId}`);

        facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookId}/copies`, {
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

        successMessage = `${entityType} duplicated successfully`;
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
          error: 'Failed to update on Facebook', 
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
