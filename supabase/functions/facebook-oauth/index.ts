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
      
      // Get user's ad accounts
      const adAccountsResponse = await fetch(`https://graph.facebook.com/v20.0/me/adaccounts?access_token=${tokenData.access_token}`)
      
      if (!adAccountsResponse.ok) {
        const error = await adAccountsResponse.text()
        console.error('Failed to fetch ad accounts:', error)
        throw new Error('Failed to fetch ad accounts')
      }

      const adAccountsData = await adAccountsResponse.json()
      console.log('Ad accounts response:', JSON.stringify(adAccountsData, null, 2));
      console.log('Number of ad accounts found:', adAccountsData.data?.length || 0);

      // Save integration to database
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
      
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
      for (const account of adAccountsData.data) {
        await supabase
          .from('facebook_ad_accounts')
          .upsert({
            integration_id: integration.id,
            account_id: account.id,
            account_name: account.name,
            currency: account.currency,
            is_active: true,
          }, {
            onConflict: 'integration_id,account_id'
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          adAccounts: adAccountsData.data,
          integration: integration
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