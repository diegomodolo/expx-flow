import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para fazer hash SHA-256
async function sha256Hash(input: string | null | undefined): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  const normalized = input.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1];

    console.log('[Webhook] Received request for token:', token?.substring(0, 10) + '...');

    if (!token || token === 'webhook-offline-conversion') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token is required in URL path: /webhook-offline-conversion/{token}' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { eventName, eventTime, value, currency, userData, customData } = body;

    console.log('[Webhook] Event received:', eventName);

    // Validate required fields
    if (!eventName) {
      return new Response(
        JSON.stringify({ success: false, error: 'eventName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData?.email && !userData?.phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least email or phone is required in userData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate token and get client info
    const { data: tokenData, error: tokenError } = await supabase
      .from('offline_conversion_webhook_tokens')
      .select(`
        id,
        client_id,
        company_id,
        is_active,
        clients (
          id,
          name,
          offline_event_set_id,
          company_id
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      console.error('[Webhook] Invalid or inactive token');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive webhook token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = tokenData.clients;
    if (!client) {
      console.error('[Webhook] Client not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Webhook] Token validated for client:', client.name);

    // Check if client has offline_event_set_id configured
    if (!client.offline_event_set_id) {
      console.error('[Webhook] Client does not have offline_event_set_id configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Client does not have offline event set configured. Please configure it first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('[Webhook] No active Facebook integration found');
      return new Response(
        JSON.stringify({ success: false, error: 'No active Facebook integration found for this client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(integration.expires_at);
    if (expiresAt < new Date()) {
      console.error('[Webhook] Facebook integration token expired');
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook integration token has expired. Please reconnect.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash user data
    const hashedEmail = await sha256Hash(userData.email);
    const hashedPhone = await sha256Hash(userData.phone);
    const hashedFirstName = await sha256Hash(userData.firstName);
    const hashedLastName = await sha256Hash(userData.lastName);
    const hashedCity = await sha256Hash(userData.city);
    const hashedState = await sha256Hash(userData.state);
    const hashedZip = await sha256Hash(userData.zip);
    const hashedCountry = await sha256Hash(userData.country);

    // Prepare payload for Meta
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime || Math.floor(Date.now() / 1000),
          user_data: {
            em: hashedEmail,
            ph: hashedPhone,
            fn: hashedFirstName,
            ln: hashedLastName,
            ct: hashedCity,
            st: hashedState,
            zp: hashedZip,
            country: hashedCountry,
          },
          custom_data: customData || {},
        },
      ],
    };

    if (value !== undefined && value !== null) {
      payload.data[0].custom_data.value = value;
      payload.data[0].custom_data.currency = currency || 'BRL';
    }

    console.log('[Webhook] Sending conversion to Meta for event set:', client.offline_event_set_id);

    // Send to Meta
    const metaUrl = `https://graph.facebook.com/v18.0/${client.offline_event_set_id}/events`;
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        access_token: integration.access_token,
      }),
    });

    const metaData = await metaResponse.json();
    const metaSuccess = metaResponse.ok && metaData.events_received !== undefined;

    console.log('[Webhook] Meta API response:', metaData);

    // Log conversion in database
    const { error: logError } = await supabase
      .from('offline_conversions')
      .insert({
        client_id: client.id,
        company_id: client.company_id,
        event_name: eventName,
        event_time: new Date((eventTime || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        value: value || null,
        currency: currency || 'BRL',
        user_data: userData,
        custom_data: customData || {},
        status: metaSuccess ? 'sent' : 'error',
        meta_response: metaData,
        source: 'webhook',
      });

    if (logError) {
      console.error('[Webhook] Error logging conversion:', logError);
    }

    // Update last_used_at for token
    await supabase
      .from('offline_conversion_webhook_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (!metaSuccess) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send conversion to Meta', 
          details: metaData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Webhook] Conversion processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conversion sent successfully to Meta',
        eventsReceived: metaData.events_received,
        client: client.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
