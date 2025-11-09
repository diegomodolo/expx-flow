import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      clientId,
      leadId,
      eventName = 'Purchase',
      eventTime,
      value,
      currency = 'BRL',
      actionSource = 'crm',
      userData,
      customData,
    } = await req.json();

    console.log('Received offline conversion request for client:', clientId);

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company_id, offline_event_set_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.offline_event_set_id) {
      console.error('Offline Event Set ID not configured for client:', clientId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Offline Event Set ID not configured for this client. Please configure it in the client settings.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Facebook integration not found:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook integration not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(integration.expires_at) < new Date()) {
      console.error('Facebook integration token expired');
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook token expired. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hashedUserData: any = {};
    
    if (userData?.email) {
      hashedUserData.em = await sha256Hash(userData.email);
    }
    if (userData?.phone) {
      const cleanPhone = userData.phone.replace(/\D/g, '');
      hashedUserData.ph = await sha256Hash(cleanPhone);
    }
    if (userData?.firstName) {
      hashedUserData.fn = await sha256Hash(userData.firstName);
    }
    if (userData?.lastName) {
      hashedUserData.ln = await sha256Hash(userData.lastName);
    }
    if (userData?.city) {
      hashedUserData.ct = await sha256Hash(userData.city);
    }
    if (userData?.state) {
      hashedUserData.st = await sha256Hash(userData.state);
    }
    if (userData?.zip) {
      hashedUserData.zp = await sha256Hash(userData.zip);
    }
    if (userData?.country) {
      const normalizedCountry = userData.country.toLowerCase().substring(0, 2);
      hashedUserData.country = await sha256Hash(normalizedCountry);
    }
    // Facebook cookies (fbc, fbp) should NOT be hashed
    if (userData?.fbc) {
      hashedUserData.fbc = userData.fbc;
    }
    if (userData?.fbp) {
      hashedUserData.fbp = userData.fbp;
    }

    console.log('User data hashed successfully');

    const finalEventTime = eventTime || Math.floor(Date.now() / 1000);
    
    // Generate unique event_id for deduplication
    const eventId = leadId 
      ? `lead_${leadId}_${eventName}_${finalEventTime}`
      : `event_${clientId}_${eventName}_${finalEventTime}`;
    
    // Prepare custom_data with lead_id
    const finalCustomData = {
      value: value || 0,
      currency: currency,
      ...(leadId && { lead_id: leadId }),
      ...customData,
    };
    
    const metaPayload = {
      data: [
        {
          event_name: eventName,
          event_time: finalEventTime,
          event_id: eventId,
          action_source: actionSource,
          user_data: hashedUserData,
          custom_data: finalCustomData,
        },
      ],
    };

    console.log('Prepared payload for Meta:', JSON.stringify(metaPayload, null, 2));

    const metaUrl = `https://graph.facebook.com/v19.0/${client.offline_event_set_id}/events?access_token=${integration.access_token}`;
    
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await metaResponse.json();
    console.log('Meta API response:', JSON.stringify(metaData, null, 2));

    const manualPayload = {
      leadId,
      eventName,
      eventTime: finalEventTime,
      eventId,
      actionSource,
      value,
      currency,
      userData,
      customData: finalCustomData,
      source: 'manual',
      sentAt: new Date().toISOString(),
    };

    const conversionRecord = {
      client_id: clientId,
      company_id: client.company_id,
      offline_event_set_id: client.offline_event_set_id,
      event_name: eventName,
      event_time: finalEventTime,
      value: value || null,
      currency: currency,
      user_email_hash: hashedUserData.em || null,
      user_phone_hash: hashedUserData.ph || null,
      user_first_name_hash: hashedUserData.fn || null,
      user_last_name_hash: hashedUserData.ln || null,
      user_city_hash: hashedUserData.ct || null,
      user_state_hash: hashedUserData.st || null,
      user_zip_hash: hashedUserData.zp || null,
      user_country_hash: hashedUserData.country || null,
      custom_data: finalCustomData,
      webhook_payload: manualPayload,
      status: metaResponse.ok ? 'sent' : 'error',
      meta_response: metaData,
      error_message: metaResponse.ok ? null : (metaData.error?.message || 'Unknown error'),
      sent_at: metaResponse.ok ? new Date().toISOString() : null,
      source: 'manual',
    };

    const { data: savedConversion, error: saveError } = await supabase
      .from('offline_conversions')
      .insert(conversionRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving conversion log:', saveError);
    }

    if (!metaResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: metaData.error?.message || 'Failed to send conversion to Meta',
          metaResponse: metaData,
        }),
        {
          status: metaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Offline conversion sent successfully',
        conversionId: savedConversion?.id,
        eventId,
        metaResponse: metaData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-offline-conversion:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
