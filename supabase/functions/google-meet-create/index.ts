import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getValidAccessToken(supabaseClient: any, companyId: string) {
  const { data: integration, error } = await supabaseClient
    .from('google_meet_integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (error || !integration) {
    throw new Error('Google Meet integration not found. Please connect Google Meet first in Settings > Google Meet & Drive.');
  }

  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log('Token expired or expiring soon, refreshing...');
    const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')?.trim();

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Token refresh failed:', err);
      throw new Error('Failed to refresh Google Meet token. Please reconnect in Settings > Google Meet & Drive.');
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabaseClient
      .from('google_meet_integrations')
      .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
      .eq('id', integration.id);

    return tokens.access_token;
  }

  return integration.access_token;
}

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
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { title, clientId, squadId, scheduledAt, companyId } = await req.json();

    if (!companyId || !title) {
      throw new Error('Missing required fields: companyId, title');
    }

    console.log('Creating Google Meet space for company:', companyId);

    const accessToken = await getValidAccessToken(supabaseClient, companyId);

    // Create Google Meet Space
    const meetResponse = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
        },
      }),
    });

    if (!meetResponse.ok) {
      const errorText = await meetResponse.text();
      console.error('Google Meet API error:', meetResponse.status, errorText);
      throw new Error(`Failed to create Meet space: ${meetResponse.status} - ${errorText}`);
    }

    const space = await meetResponse.json();
    console.log('Meet space created:', space);

    // Save to database
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('google_meet_meetings')
      .insert({
        company_id: companyId,
        client_id: clientId || null,
        squad_id: squadId || null,
        created_by: user.id,
        google_space_id: space.name || '',
        meeting_uri: space.meetingUri || '',
        meeting_code: space.meetingCode || '',
        title,
        status: 'scheduled',
        scheduled_at: scheduledAt || null,
        transcript_status: 'pending',
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Failed to save meeting:', meetingError);
      throw meetingError;
    }

    console.log('Meeting saved:', meeting.id);

    return new Response(
      JSON.stringify({ success: true, meeting }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-meet-create:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
