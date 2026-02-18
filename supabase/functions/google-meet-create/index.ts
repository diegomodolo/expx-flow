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

  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log('Token expired or expiring soon, refreshing...');
    const clientId = Deno.env.get('GOOGLE_MEET_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('GOOGLE_MEET_CLIENT_SECRET')?.trim();

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

    const { title, clientId, squadId, scheduledAt, companyId, participants, timezoneOffset } = await req.json();

    if (!companyId || !title) {
      throw new Error('Missing required fields: companyId, title');
    }

    console.log('Creating Google Meet space for company:', companyId);

    const accessToken = await getValidAccessToken(supabaseClient, companyId);

    // Create Google Meet Space with auto-recording and auto-transcription enabled
    const meetResponse = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
          artifactConfig: {
            recordingConfig: {
              autoRecordingGeneration: 'ENABLED',
            },
            transcriptionConfig: {
              autoTranscriptionGeneration: 'ENABLED',
            },
          },
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

    // Convert scheduledAt from local time to UTC using the timezone offset
    let scheduledAtUTC: string | null = null;
    if (scheduledAt) {
      // scheduledAt comes as "YYYY-MM-DDTHH:mm" (local time)
      // timezoneOffset is in minutes (e.g., 180 for UTC-3)
      const offset = timezoneOffset || 0;
      const localDate = new Date(scheduledAt);
      // The browser datetime-local gives us the local time components
      // We need to interpret it as the user's local time and convert to UTC
      const utcDate = new Date(localDate.getTime() + offset * 60 * 1000);
      scheduledAtUTC = utcDate.toISOString();
      console.log('Scheduled at (local):', scheduledAt, 'Offset:', offset, 'UTC:', scheduledAtUTC);
    }

    // Create Google Calendar event if we have a scheduled time
    let calendarEventId: string | null = null;
    if (scheduledAtUTC) {
      try {
        const startTime = new Date(scheduledAtUTC);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

        const attendees = (participants || [])
          .filter((p: any) => p.email)
          .map((p: any) => ({ email: p.email, displayName: p.name || undefined }));

        const calendarEvent = {
          summary: title,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          conferenceData: {
            entryPoints: [{
              entryPointType: 'video',
              uri: space.meetingUri,
              label: space.meetingCode,
            }],
            conferenceSolution: {
              key: { type: 'hangoutsMeet' },
              name: 'Google Meet',
            },
            conferenceId: space.meetingCode,
          },
          attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 10 },
              { method: 'email', minutes: 30 },
            ],
          },
          sendUpdates: 'all',
        };

        console.log('Creating Calendar event with', attendees.length, 'attendees');

        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarEvent),
          }
        );

        if (calendarResponse.ok) {
          const calEvent = await calendarResponse.json();
          calendarEventId = calEvent.id;
          console.log('Calendar event created:', calendarEventId);
        } else {
          const calError = await calendarResponse.text();
          console.error('Calendar event creation failed (non-blocking):', calendarResponse.status, calError);
          // Non-blocking: meeting is still created even if calendar fails
        }
      } catch (calErr) {
        console.error('Calendar event creation error (non-blocking):', calErr);
      }
    }

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
        scheduled_at: scheduledAtUTC || null,
        transcript_status: 'pending',
        participants: participants || [],
        google_calendar_event_id: calendarEventId,
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Failed to save meeting:', meetingError);
      throw meetingError;
    }

    console.log('Meeting saved:', meeting.id);

    return new Response(
      JSON.stringify({ success: true, meeting, calendarEventCreated: !!calendarEventId }),
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
