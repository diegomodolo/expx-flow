import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Função auxiliar para hash SHA-256
async function sha256Hash(input: string | null | undefined): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  // Normalizar: minúsculas + trim
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
      eventName = 'Purchase',
      eventTime, // Unix timestamp em segundos, ou será gerado
      value,
      currency = 'BRL',
      userData, // { email, phone, firstName, lastName, city, state, zip, country }
      customData, // Dados adicionais opcionais
    } = await req.json();

    console.log('Received offline conversion request for client:', clientId);

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar cliente e Offline Event Set ID
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

    // 2. Buscar integração ativa do Facebook
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

    // Verificar se token expirou
    if (new Date(integration.expires_at) < new Date()) {
      console.error('Facebook integration token expired');
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook token expired. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Hash dos dados do usuário (user_data)
    // TODOS os campos devem ser hasheados, incluindo country (conforme documentação oficial do Meta)
    const hashedUserData: any = {};
    
    if (userData?.email) {
      hashedUserData.em = await sha256Hash(userData.email);
    }
    if (userData?.phone) {
      // Remover caracteres não numéricos antes de hashear
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
    // Country deve ser normalizado para código ISO de 2 letras lowercase, DEPOIS hasheado
    if (userData?.country) {
      const normalizedCountry = userData.country.toLowerCase().substring(0, 2);
      hashedUserData.country = await sha256Hash(normalizedCountry);
    }

    console.log('User data hashed successfully');

    // 4. Preparar payload para o Meta
    const finalEventTime = eventTime || Math.floor(Date.now() / 1000);
    
    const metaPayload = {
      data: [
        {
          event_name: eventName,
          event_time: finalEventTime,
          user_data: hashedUserData,
          custom_data: {
            value: value || 0,
            currency: currency,
            ...customData,
          },
        },
      ],
    };

    console.log('Prepared payload for Meta:', JSON.stringify(metaPayload, null, 2));

    // 5. Enviar para o Meta Graph API
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

    // 6. Salvar payload original e log no banco de dados
    const manualPayload = {
      eventName,
      eventTime: finalEventTime,
      value,
      currency,
      userData, // dados originais não hasheados
      customData,
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
      custom_data: customData || null,
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

    // 7. Retornar resposta
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
