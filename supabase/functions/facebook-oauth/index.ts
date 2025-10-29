import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Facebook OAuth request received:', req.method, req.url);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    console.log('Action parameter:', action);

    if (action === 'exchange') {
      // Exchange authorization code for access token
      const { code, companyId } = await req.json()
      console.log('Received code and companyId:', { code: code?.substring(0, 20) + '...', companyId });
      
      const facebookAppId = Deno.env.get('FACEBOOK_APP_ID')
      const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET')
      
      console.log('Facebook credentials check:', { 
        appIdExists: !!facebookAppId, 
        secretExists: !!facebookAppSecret 
      });
      
      if (!facebookAppId || !facebookAppSecret) {
        console.error('Facebook credentials missing');
        throw new Error('Facebook credentials not configured')
      }

      // Get redirect URI based on current domain
      const origin = req.headers.get('origin') || ''
      let redirectUri = ''
      if (origin.includes('lovable.app') || origin.includes('lovableproject.com')) {
        if (origin.includes('preview--')) {
          redirectUri = `${origin}/auth/callback`
        } else {
          redirectUri = 'https://multi-campaign-insight.lovable.app/auth/callback'
        }
      } else {
        redirectUri = 'https://controledetrafego.com.br/auth/callback'
      }
      
      console.log('Redirect URI determined:', redirectUri);

      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token`;
      const tokenParams = new URLSearchParams({
        client_id: facebookAppId,
        client_secret: facebookAppSecret,
        redirect_uri: redirectUri,
        code: code,
      });
      
      console.log('Attempting token exchange with Facebook...');
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams,
      })

      console.log('Facebook token response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        const error = await tokenResponse.text()
        console.error('Facebook token exchange failed:', error)
        throw new Error(`Facebook API error: ${error}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful, expires in:', tokenData.expires_in);
      
      // Get user's ad accounts with pagination to fetch all accounts
      let allAdAccounts = [];
      let nextUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_id,currency,account_status,business_name&limit=100&access_token=${tokenData.access_token}`;
      
      while (nextUrl) {
        console.log('Fetching ad accounts from:', nextUrl.replace(tokenData.access_token, '[TOKEN_HIDDEN]'));
        
        const adAccountsResponse = await fetch(nextUrl);
        
        if (!adAccountsResponse.ok) {
          const error = await adAccountsResponse.text()
          console.error('Failed to fetch ad accounts:', error)
          throw new Error('Failed to fetch ad accounts')
        }

        const adAccountsData = await adAccountsResponse.json();
        console.log(`Fetched ${adAccountsData.data?.length || 0} accounts in this batch`);
        
        // Add accounts from this batch to the total
        if (adAccountsData.data) {
          allAdAccounts.push(...adAccountsData.data);
        }
        
        // Check if there's a next page
        nextUrl = adAccountsData.paging?.next || null;
      }
      
      console.log('Total ad accounts found:', allAdAccounts.length);
      const adAccountsData = { data: allAdAccounts };

      // Save integration to database
      // Facebook long-lived tokens geralmente duram 60 dias, mas nem sempre retornam expires_in
      const expiresInSeconds = tokenData.expires_in || (60 * 24 * 60 * 60); // 60 dias como padrão
      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));
      
      console.log('Token will expire at:', expiresAt.toISOString(), 
                  tokenData.expires_in ? '(from Facebook)' : '(default 60 days)');
      
      const { data: integration, error: integrationError } = await supabase
        .from('facebook_integrations')
        .upsert({
          company_id: companyId,
          access_token: tokenData.access_token,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single()

      if (integrationError) {
        console.error('Database error:', integrationError)
        throw new Error('Failed to save integration')
      }

      // Save ad accounts
      const savedAccounts = [];
      for (const account of adAccountsData.data || []) {
        console.log('Processing account:', JSON.stringify(account, null, 2));
        
        // Skip accounts without required fields
        if (!account.id) {
          console.log('Skipping account without ID:', account);
          continue;
        }

        const { data: savedAccount, error: accountError } = await supabase
          .from('facebook_ad_accounts')
          .upsert({
            integration_id: integration.id,
            account_id: account.id,
            account_name: account.name || account.business_name || `Conta ${account.account_id || account.id}`,
            currency: account.currency || 'USD',
            is_active: account.account_status === 'ACTIVE' || true,
          }, {
            onConflict: 'integration_id,account_id'
          })
          .select()
          .single();

        if (accountError) {
          console.error('Error saving account:', accountError, 'Account data:', account);
        } else {
          savedAccounts.push(savedAccount);
          console.log('Successfully saved account:', savedAccount);
        }
      }

      console.log(`Successfully processed ${savedAccounts.length} ad accounts out of ${adAccountsData.data?.length || 0} total accounts`);

      return new Response(
        JSON.stringify({
          success: true,
          adAccounts: savedAccounts,
          integration: integration
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'refresh-accounts') {
      const { integrationId, companyId } = await req.json();
      
      if (!integrationId || !companyId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Integration ID and Company ID are required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get the integration
      const { data: integration, error: integrationError } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      if (integrationError || !integration) {
        return new Response(
          JSON.stringify({ success: false, error: 'Integration not found or expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Check if token is expired
      if (new Date(integration.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Integration token has expired. Please reconnect.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Fetch current ad accounts from Facebook with pagination
      let allAdAccounts = [];
      let nextUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_id,currency,account_status,business_name&limit=100&access_token=${integration.access_token}`;
      let batchCount = 0;
      
      console.log('Starting refresh accounts pagination...');
      
      while (nextUrl) {
        batchCount++;
        console.log(`Batch ${batchCount} - Refreshing ad accounts from: ${nextUrl.replace(integration.access_token, '[TOKEN_HIDDEN]')}`);
        
        const adAccountsResponse = await fetch(nextUrl);
        
        if (!adAccountsResponse.ok) {
          const error = await adAccountsResponse.text()
          console.error('Failed to fetch ad accounts:', error)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch accounts from Facebook' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        const batchData = await adAccountsResponse.json();
        console.log(`Batch ${batchCount} - Fetched ${batchData.data?.length || 0} accounts`);
        console.log(`Batch ${batchCount} - Has next page: ${!!batchData.paging?.next}`);
        
        // Add accounts from this batch to the total
        if (batchData.data) {
          allAdAccounts.push(...batchData.data);
        }
        
        // Check if there's a next page
        nextUrl = batchData.paging?.next || null;
        console.log(`Batch ${batchCount} - Next URL: ${nextUrl ? 'EXISTS' : 'NULL'}`);
      }
      
      console.log(`Pagination complete! Total batches: ${batchCount}, Total accounts: ${allAdAccounts.length}`);
      const adAccountsData = { data: allAdAccounts };

      // Update ad accounts in database (preserve existing relationships)
      const savedAccounts = [];
      for (const account of adAccountsData.data || []) {
        console.log('Processing account:', JSON.stringify(account, null, 2));
        
        if (!account.id) continue;

        const { data: savedAccount, error: accountError } = await supabase
          .from('facebook_ad_accounts')
          .upsert({
            integration_id: integration.id,
            account_id: account.id,
            account_name: account.name || account.business_name || `Conta ${account.account_id || account.id}`,
            currency: account.currency || 'USD',
            is_active: account.account_status === 'ACTIVE' || true,
          }, {
            onConflict: 'integration_id,account_id'
          })
          .select()
          .single();

        if (accountError) {
          console.error('Error saving account:', accountError, 'Account data:', account);
        } else {
          savedAccounts.push(savedAccount);
          console.log('Successfully updated account:', savedAccount);
        }
      }

      console.log(`Successfully refreshed ${savedAccounts.length} ad accounts out of ${adAccountsData.data?.length || 0} total accounts`);

      return new Response(
        JSON.stringify({
          success: true,
          adAccounts: savedAccounts
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'refresh') {
      // Refresh access token logic would go here
      // Facebook doesn't provide refresh tokens for marketing API
      // Tokens typically last 60 days and need to be renewed manually
      return new Response(
        JSON.stringify({ error: 'Token refresh not available for Facebook Marketing API' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})