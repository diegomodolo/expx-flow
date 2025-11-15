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

    const { action, code, companyId, redirectUri } = await req.json();

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

    // Retornar sucesso SEM accounts (será configurado manualmente)
    return new Response(
      JSON.stringify({
        success: true,
        integration,
        message: 'OAuth completed successfully. Configure Google Customer ID in settings.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
