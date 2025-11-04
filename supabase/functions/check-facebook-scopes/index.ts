import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    user_id: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();

    // Use service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    console.log('Checking Facebook scopes for company:', companyId);

    // Get the active Facebook integration for this company
    const { data: integration, error: integrationError } = await supabaseClient
      .from('facebook_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      throw new Error('Facebook integration not found or inactive');
    }

    console.log('Found integration:', integration.id);

    // Check if token is expired
    const expiresAt = new Date(integration.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;

    if (isExpired) {
      console.warn('Token is expired');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token expired',
          message: 'O token do Facebook está expirado. Reconecte a integração.',
          isExpired: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Facebook App credentials
    const appId = Deno.env.get('FACEBOOK_APP_ID');
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('Facebook app credentials not configured');
    }

    // Call Facebook's debug_token endpoint
    const debugUrl = new URL('https://graph.facebook.com/v20.0/debug_token');
    debugUrl.searchParams.append('input_token', integration.access_token);
    debugUrl.searchParams.append('access_token', `${appId}|${appSecret}`);

    console.log('Calling Facebook debug_token API...');

    const response = await fetch(debugUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Facebook API error:', errorData);
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const debugData: DebugTokenResponse = await response.json();
    
    console.log('Debug token response:', JSON.stringify(debugData, null, 2));

    const scopes = debugData.data.scopes || [];
    const hasAdsManagement = scopes.includes('ads_management');
    const hasAdsRead = scopes.includes('ads_read');
    const hasBusinessManagement = scopes.includes('business_management');

    console.log('Scopes found:', scopes);
    console.log('Has ads_management:', hasAdsManagement);

    return new Response(
      JSON.stringify({
        success: true,
        scopes: scopes,
        permissions: {
          ads_management: hasAdsManagement,
          ads_read: hasAdsRead,
          business_management: hasBusinessManagement,
        },
        tokenInfo: {
          isValid: debugData.data.is_valid,
          expiresAt: new Date(debugData.data.expires_at * 1000).toISOString(),
          userId: debugData.data.user_id,
          appId: debugData.data.app_id,
        },
        warning: !hasAdsManagement ? 
          'O token não possui a permissão "ads_management" necessária para enviar conversões offline. Reconecte a integração para obter esta permissão.' : 
          null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking Facebook scopes:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
