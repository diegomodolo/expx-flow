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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { customerId, companyId, clientId } = await req.json();

    if (!customerId || !companyId) {
      throw new Error('Customer ID and Company ID are required');
    }

    console.log('Fetching Google Ads account details for customer:', customerId);

    // Buscar integração ativa
    const { data: integration, error: integrationError } = await supabaseClient
      .from('google_ads_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Google Ads integration not found or inactive');
    }

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN not configured');
    }

    // Limpar Customer ID (remover hífens e espaços)
    const cleanCustomerId = customerId.replace(/[-\s]/g, '');

    // Buscar detalhes da conta usando Google Ads API
    const query = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
      WHERE customer.id = ${cleanCustomerId}
    `;

    console.log('Executing GAQL query for customer:', cleanCustomerId);

    const customerDetailsResponse = await fetch(
      `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!customerDetailsResponse.ok) {
      const errorText = await customerDetailsResponse.text();
      console.error('Failed to fetch customer details:', errorText);
      throw new Error(`Failed to fetch account details. Verify the Customer ID is correct and you have access to it.`);
    }

    const customerDetails = await customerDetailsResponse.json();
    console.log('Customer details received:', customerDetails);

    if (!customerDetails.results || customerDetails.results.length === 0) {
      throw new Error('No account found with this Customer ID');
    }

    const accountData = customerDetails.results[0].customer;

    // Salvar ou atualizar conta no banco
    const { data: savedAccount, error: saveError } = await supabaseClient
      .from('google_ads_accounts')
      .upsert({
        company_id: companyId,
        integration_id: integration.id,
        google_customer_id: cleanCustomerId,
        account_name: accountData.descriptiveName || `Conta ${cleanCustomerId}`,
        currency: accountData.currencyCode || 'USD',
        time_zone: accountData.timeZone || 'America/Sao_Paulo',
        is_active: accountData.status === 'ENABLED',
        client_id: clientId || null,
      }, {
        onConflict: 'google_customer_id,company_id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save account:', saveError);
      throw saveError;
    }

    console.log('Account saved successfully:', savedAccount.id);

    return new Response(
      JSON.stringify({
        success: true,
        account: savedAccount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in google-ads-fetch-account:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
