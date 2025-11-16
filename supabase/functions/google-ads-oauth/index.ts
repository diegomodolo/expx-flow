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

      // Fetch user email from Google OAuth2 API
      let userEmail = null;
      try {
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            },
          }
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          userEmail = userInfo.email;
          console.log('User email fetched:', userEmail);
        }
      } catch (error) {
        console.warn('Failed to fetch user email:', error);
      }

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
        user_email: userEmail,
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
        'https://googleads.googleapis.com/v22/customers:listAccessibleCustomers',
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

      // Salvar cada conta encontrada (incluindo MCCs e sub-contas)
      const accounts = [];
      const resourceNames = accessibleCustomers.resourceNames || [];
      const processedCustomerIds = new Set(); // Evitar duplicatas

      for (const customerResourceName of resourceNames) {
        // Extrair customer ID do resource name (formato: customers/1234567890)
        const customerId = customerResourceName.split('/')[1];
        
        if (processedCustomerIds.has(customerId)) {
          continue;
        }
        processedCustomerIds.add(customerId);
        
        // Buscar detalhes da conta incluindo se é MCC e status
        const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.status FROM customer WHERE customer.id = ${customerId}`;
        
        const customerDetailsResponse = await fetch(
          `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
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
            const isManager = customerDetails.manager || false;
            const accountStatus = customerDetails.status || 'ENABLED';
            
            // Salvar conta principal
            const { data: account, error: accountError } = await supabaseClient
              .from('google_ads_accounts')
              .upsert({
                integration_id: integration.id,
                company_id: companyId,
                google_customer_id: customerId,
                account_name: customerDetails.descriptiveName || `Customer ${customerId}`,
                currency: customerDetails.currencyCode || 'BRL',
                time_zone: customerDetails.timeZone || 'America/Sao_Paulo',
                is_active: true,
                is_manager: isManager,
                status: accountStatus,
                parent_customer_id: null,
              }, {
                onConflict: 'google_customer_id,company_id',
              })
              .select()
              .single();

            if (!accountError && account) {
              console.log('Account saved:', account.account_name, '- Is MCC:', isManager);
              accounts.push(account);

              // Se for MCC, buscar sub-contas
              if (isManager) {
                console.log(`Fetching sub-accounts for MCC ${customerId}...`);
                
                const subAccountsQuery = `
                  SELECT 
                    customer_client.id,
                    customer_client.descriptive_name,
                    customer_client.currency_code,
                    customer_client.time_zone,
                    customer_client.status,
                    customer_client.manager
                  FROM customer_client
                  WHERE customer_client.level <= 1
                `;
                
                const subAccountsResponse = await fetch(
                  `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${tokens.access_token}`,
                      'developer-token': developerToken,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: subAccountsQuery }),
                  }
                );

                if (subAccountsResponse.ok) {
                  const subAccountsData = await subAccountsResponse.json();
                  const subAccounts = subAccountsData.results || [];
                  
                  console.log(`Found ${subAccounts.length} sub-accounts for MCC ${customerId}`);
                  
                  for (const subAccountResult of subAccounts) {
                    const subCustomer = subAccountResult.customerClient;
                    const subCustomerId = subCustomer.id.toString();
                    
                    // Evitar processar a própria MCC ou contas já processadas
                    if (subCustomerId === customerId || processedCustomerIds.has(subCustomerId)) {
                      continue;
                    }
                    processedCustomerIds.add(subCustomerId);
                    
                    const subAccountStatus = subCustomer.status || 'ENABLED';
                    const isSubManager = subCustomer.manager || false;
                    
                    // Salvar sub-conta
                    const { data: subAccount, error: subAccountError } = await supabaseClient
                      .from('google_ads_accounts')
                      .upsert({
                        integration_id: integration.id,
                        company_id: companyId,
                        google_customer_id: subCustomerId,
                        account_name: subCustomer.descriptiveName || `Customer ${subCustomerId}`,
                        currency: subCustomer.currencyCode || 'BRL',
                        time_zone: subCustomer.timeZone || 'America/Sao_Paulo',
                        is_active: true,
                        is_manager: isSubManager,
                        status: subAccountStatus,
                        parent_customer_id: customerId,
                      }, {
                        onConflict: 'google_customer_id,company_id',
                      })
                      .select()
                      .single();

                    if (!subAccountError && subAccount) {
                      console.log('Sub-account saved:', subAccount.account_name, '- Status:', subAccountStatus);
                      accounts.push(subAccount);
                    } else if (subAccountError) {
                      console.error('Error saving sub-account:', subAccountError);
                    }
                  }
                } else {
                  const errorText = await subAccountsResponse.text();
                  console.error(`Failed to fetch sub-accounts for MCC ${customerId}:`, errorText);
                }
              }
            } else if (accountError) {
              console.error('Error saving account:', accountError);
            }
          }
        } else {
          const errorData = await customerDetailsResponse.json().catch(() => ({}));
          
          // Check if error is CUSTOMER_NOT_ENABLED
          const errors = errorData?.error?.details?.[0]?.errors || [];
          const isNotEnabled = errors.some((err: any) => 
            err?.errorCode?.authorizationError === 'CUSTOMER_NOT_ENABLED'
          );
          
          if (isNotEnabled) {
            console.log(`Customer ${customerId} is not enabled, skipping...`);
          } else {
            console.error(`Failed to fetch details for customer ${customerId}:`, errorData);
          }
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

    // Action: refresh_accounts (re-fetch accounts for existing integration)
    if (action === 'refresh_accounts') {
      const { integrationId, companyId: refreshCompanyId } = body;

      if (!integrationId || !refreshCompanyId) {
        throw new Error('Missing integrationId or companyId');
      }

      console.log('Refreshing accounts for integration:', integrationId);

      // Fetch integration
      const { data: integration, error: integrationError } = await supabaseClient
        .from('google_ads_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', refreshCompanyId)
        .single();

      if (integrationError || !integration) {
        throw new Error('Integration not found');
      }

      const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
      if (!developerToken) {
        throw new Error('Developer token not configured');
      }

      try {
        const accessibleCustomersResponse = await fetch(
          'https://googleads.googleapis.com/v22/customers:listAccessibleCustomers',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'developer-token': developerToken,
            },
          }
        );

        if (!accessibleCustomersResponse.ok) {
          throw new Error('Failed to fetch accessible customers');
        }

        const accessibleCustomers = await accessibleCustomersResponse.json();
        const resourceNames = accessibleCustomers.resourceNames || [];
        const accounts = [];
        const processedCustomerIds = new Set();

        for (const customerResourceName of resourceNames) {
          const customerId = customerResourceName.split('/')[1];
          
          if (processedCustomerIds.has(customerId)) {
            continue;
          }
          processedCustomerIds.add(customerId);
          
          const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.status FROM customer WHERE customer.id = ${customerId}`;
          
          const customerDetailsResponse = await fetch(
            `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
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

          if (customerDetailsResponse.ok) {
            const customerDetailsData = await customerDetailsResponse.json();
            const results = customerDetailsData.results || [];
            
            if (results.length > 0) {
              const customerDetails = results[0].customer;
              const isManager = customerDetails.manager || false;
              const accountStatus = customerDetails.status || 'ENABLED';
              
              const { data: account, error: accountError } = await supabaseClient
                .from('google_ads_accounts')
                .upsert({
                  integration_id: integration.id,
                  company_id: refreshCompanyId,
                  google_customer_id: customerId,
                  account_name: customerDetails.descriptiveName || `Customer ${customerId}`,
                  currency: customerDetails.currencyCode || 'BRL',
                  time_zone: customerDetails.timeZone || 'America/Sao_Paulo',
                  is_active: true,
                  is_manager: isManager,
                  status: accountStatus,
                  parent_customer_id: null,
                }, {
                  onConflict: 'google_customer_id,company_id',
                })
                .select()
                .single();

              if (!accountError && account) {
                accounts.push(account);

                if (isManager) {
                  const subAccountsQuery = `
                    SELECT 
                      customer_client.id,
                      customer_client.descriptive_name,
                      customer_client.currency_code,
                      customer_client.time_zone,
                      customer_client.status,
                      customer_client.manager
                    FROM customer_client
                    WHERE customer_client.level <= 1
                  `;
                  
                  const subAccountsResponse = await fetch(
                    `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${integration.access_token}`,
                        'developer-token': developerToken,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ query: subAccountsQuery }),
                    }
                  );

                  if (subAccountsResponse.ok) {
                    const subAccountsData = await subAccountsResponse.json();
                    const subAccounts = subAccountsData.results || [];
                    
                    for (const subAccountResult of subAccounts) {
                      const subCustomer = subAccountResult.customerClient;
                      const subCustomerId = subCustomer.id.toString();
                      
                      if (subCustomerId === customerId || processedCustomerIds.has(subCustomerId)) {
                        continue;
                      }
                      processedCustomerIds.add(subCustomerId);
                      
                      const subAccountStatus = subCustomer.status || 'ENABLED';
                      const isSubManager = subCustomer.manager || false;
                      
                      const { data: subAccount } = await supabaseClient
                        .from('google_ads_accounts')
                        .upsert({
                          integration_id: integration.id,
                          company_id: refreshCompanyId,
                          google_customer_id: subCustomerId,
                          account_name: subCustomer.descriptiveName || `Customer ${subCustomerId}`,
                          currency: subCustomer.currencyCode || 'BRL',
                          time_zone: subCustomer.timeZone || 'America/Sao_Paulo',
                          is_active: true,
                          is_manager: isSubManager,
                          status: subAccountStatus,
                          parent_customer_id: customerId,
                        }, {
                          onConflict: 'google_customer_id,company_id',
                        })
                        .select()
                        .single();

                      if (subAccount) {
                        accounts.push(subAccount);
                      }
                    }
                  }
                }
              }
            }
          } else {
            const errorData = await customerDetailsResponse.json().catch(() => ({}));
            const errors = errorData?.error?.details?.[0]?.errors || [];
            const isNotEnabled = errors.some((err: any) => 
              err?.errorCode?.authorizationError === 'CUSTOMER_NOT_ENABLED'
            );
            
            if (!isNotEnabled) {
              console.error(`Failed to fetch details for customer ${customerId}:`, errorData);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            accounts,
            message: `Successfully refreshed ${accounts.length} accounts`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (refreshError) {
        console.error('Error refreshing accounts:', refreshError);
        throw refreshError;
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
