import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  console.log('google-ads-oauth function called, method:', req.method);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    console.log('Request body:', { ...body, code: body.code ? 'PRESENT' : 'MISSING' });
    
    const { action, code, companyId, redirectUri } = body;

    if (action === 'exchange') {
      // Exchange authorization code for tokens
      const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');

      // Garantir que não há espaços em branco
      const cleanClientId = clientId?.trim();
      const cleanClientSecret = clientSecret?.trim();
      const cleanRedirectUri = redirectUri?.trim();

      console.log('Token exchange request:', {
        hasClientId: !!cleanClientId,
        hasClientSecret: !!cleanClientSecret,
        redirectUri: cleanRedirectUri,
        codeLength: code?.length
      });

      console.log('Exchanging code for tokens...');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: cleanClientId!,
          client_secret: cleanClientSecret!,
          redirect_uri: cleanRedirectUri!,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed:', errorData);
        console.error('Request details:', {
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          redirectUri: cleanRedirectUri,
          codeProvided: !!code,
          codeLength: code?.length,
          status: tokenResponse.status,
          statusText: tokenResponse.statusText
        });
        
        // Parse error para mensagem mais clara
        let errorMessage = 'Failed to exchange code for tokens';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error === 'invalid_grant') {
            errorMessage = 'Código de autorização inválido ou expirado. Por favor, tente novamente.';
          } else {
            errorMessage = `Google OAuth error: ${errorJson.error_description || errorJson.error}`;
          }
        } catch {
          errorMessage = errorData;
        }
        
        throw new Error(errorMessage);
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens received successfully');

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Save integration (sem buscar customers - será configurado manualmente)
      const { data: integration, error: integrationError } = await supabaseClient
      .from('google_ads_integrations')
      .upsert({
        company_id: companyId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        is_active: true,
      }, {
        onConflict: 'company_id',
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Failed to save integration:', integrationError);
      throw integrationError;
    }

    console.log('Integration saved successfully:', integration.id);

    // Buscar contas acessíveis do Google Ads automaticamente
    console.log('Fetching accessible Google Ads accounts...');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!developerToken) {
      console.warn('GOOGLE_ADS_DEVELOPER_TOKEN not set, skipping automatic account fetch');
      return new Response(
        JSON.stringify({
          success: true,
          integration,
          accounts: [],
          message: 'OAuth completed. Add Developer Token to fetch accounts automatically.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const accessibleCustomersResponse = await fetch(
        'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'developer-token': developerToken,
          },
        }
      );

      if (!accessibleCustomersResponse.ok) {
        const errorText = await accessibleCustomersResponse.text();
        console.error('Failed to fetch accessible customers:', errorText);
        
        return new Response(
          JSON.stringify({
            success: true,
            integration,
            accounts: [],
            warning: 'OAuth successful but failed to fetch accounts.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const accessibleCustomers = await accessibleCustomersResponse.json();
      console.log('Accessible customers:', accessibleCustomers);

      // Salvar cada conta encontrada
      const accounts = [];
      const resourceNames = accessibleCustomers.resourceNames || [];

      for (const customerResourceName of resourceNames) {
        // Extrair customer ID do resource name (formato: customers/1234567890)
        const customerId = customerResourceName.split('/')[1];
        
        // Buscar detalhes da conta usando Google Ads API query
        const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer WHERE customer.id = ${customerId}`;
        
        const customerDetailsResponse = await fetch(
          `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'developer-token': developerToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          }
        );

        if (customerDetailsResponse.ok) {
          const customerDetailsData = await customerDetailsResponse.json();
          const results = customerDetailsData.results || [];
          
          if (results.length > 0) {
            const customerDetails = results[0].customer;
            
            // Inserir na tabela google_ads_accounts
            const { data: account, error: accountError } = await supabaseClient
              .from('google_ads_accounts')
              .upsert({
                integration_id: integration.id,
                company_id: companyId,
                google_customer_id: customerId,
                account_name: customerDetails.descriptiveName || `Customer ${customerId}`,
                currency: customerDetails.currencyCode || 'BRL',
                is_active: true,
              }, {
                onConflict: 'integration_id,google_customer_id',
              })
              .select()
              .single();

            if (!accountError && account) {
              console.log('Account saved:', account.account_name);
              accounts.push(account);
            } else if (accountError) {
              console.error('Error saving account:', accountError);
            }
          }
        } else {
          const errorText = await customerDetailsResponse.text();
          console.error(`Failed to fetch details for customer ${customerId}:`, errorText);
        }
      }

      console.log(`Successfully saved ${accounts.length} Google Ads accounts`);

      return new Response(
        JSON.stringify({
          success: true,
          integration,
          accounts,
          message: 'Google Ads connected successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError) {
      console.error('Error fetching accounts:', fetchError);
      
      return new Response(
        JSON.stringify({
          success: true,
          integration,
          accounts: [],
          warning: 'OAuth successful but error fetching accounts',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in google-ads-oauth:', error);
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
