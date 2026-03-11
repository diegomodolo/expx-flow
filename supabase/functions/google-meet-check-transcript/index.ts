import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') ?? 'https://controledetrafego.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getValidAccessToken(supabaseClient: any, companyId: string) {
  const { data: integration, error } = await supabaseClient
    .from('google_meet_integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (error || !integration) throw new Error('Google integration not found.');

  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const clientId = Deno.env.get('GOOGLE_MEET_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('GOOGLE_MEET_CLIENT_SECRET')?.trim();
    if (!clientId || !clientSecret) throw new Error('Google Meet OAuth credentials not configured');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: integration.refresh_token, grant_type: 'refresh_token',
      }),
    });
    if (!tokenResponse.ok) throw new Error('Failed to refresh Google token.');
    const tokens = await tokenResponse.json();
    await supabaseClient.from('google_meet_integrations')
      .update({ access_token: tokens.access_token, expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString() })
      .eq('id', integration.id);
    return tokens.access_token;
  }
  return integration.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const { meetingId } = await req.json();
    if (!meetingId) throw new Error('Missing meetingId');

    const { data: meeting, error: meetingError } = await supabaseClient
      .from('google_meet_meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) throw new Error('Meeting not found');

    console.log('Checking transcript for meeting:', meeting.id, 'space:', meeting.google_space_id);

    const accessToken = await getValidAccessToken(supabaseClient, meeting.company_id);

    await supabaseClient.from('google_meet_meetings')
      .update({ transcript_status: 'processing' })
      .eq('id', meetingId);

    // List conference records for this space
    const spaceName = meeting.google_space_id;
    const recordsUrl = `https://meet.googleapis.com/v2/conferenceRecords?filter=space.name="${spaceName}"`;
    
    const recordsResponse = await fetch(recordsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!recordsResponse.ok) {
      const errText = await recordsResponse.text();
      console.error('Failed to list conference records:', recordsResponse.status, errText);
      await supabaseClient.from('google_meet_meetings')
        .update({ transcript_status: 'failed' })
        .eq('id', meetingId);
      throw new Error(`Failed to fetch conference records: ${errText}`);
    }

    const recordsData = await recordsResponse.json();
    const conferenceRecords = recordsData.conferenceRecords || [];

    if (conferenceRecords.length === 0) {
      console.log('No conference records found yet');
      await supabaseClient.from('google_meet_meetings')
        .update({ transcript_status: 'not_available' })
        .eq('id', meetingId);
      return new Response(
        JSON.stringify({ success: false, message: 'Nenhum registro de conferência encontrado. A reunião pode não ter começado ou a transcrição ainda está sendo processada.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const latestRecord = conferenceRecords[conferenceRecords.length - 1];
    const conferenceRecordName = latestRecord.name;
    console.log('Found conference record:', conferenceRecordName);

    await supabaseClient.from('google_meet_meetings')
      .update({
        conference_record_id: conferenceRecordName,
        started_at: latestRecord.startTime || null,
        ended_at: latestRecord.endTime || null,
        status: latestRecord.endTime ? 'completed' : 'in_progress',
      })
      .eq('id', meetingId);

    // Fetch participants
    try {
      const participantsUrl = `https://meet.googleapis.com/v2/${conferenceRecordName}/participants`;
      const participantsResponse = await fetch(participantsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        const participants = participantsData.participants || [];
        
        for (const p of participants) {
          const signedinUser = p.signedinUser;
          await supabaseClient.from('google_meet_participants').upsert({
            meeting_id: meetingId,
            display_name: signedinUser?.displayName || p.anonymousUser?.displayName || 'Unknown',
            email: signedinUser?.user ? null : null,
            joined_at: p.earliestStartTime || null,
            left_at: p.latestEndTime || null,
          }, { onConflict: 'id' });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch participants:', e);
    }

    // Fetch recordings
    let recordingUrl: string | null = null;
    let recordingDriveFileId: string | null = null;
    try {
      const recordingsUrl = `https://meet.googleapis.com/v2/${conferenceRecordName}/recordings`;
      console.log('Fetching recordings from:', recordingsUrl);
      const recordingsResponse = await fetch(recordingsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (recordingsResponse.ok) {
        const recordingsData = await recordingsResponse.json();
        const recordings = recordingsData.recordings || [];
        console.log('Found', recordings.length, 'recordings');
        
        if (recordings.length > 0) {
          const recording = recordings[0];
          // driveDestination contains the file ID and export URI
          if (recording.driveDestination) {
            recordingDriveFileId = recording.driveDestination.file || null;
            recordingUrl = recording.driveDestination.exportUri || null;
            console.log('Recording drive file:', recordingDriveFileId, 'URL:', recordingUrl);
          }
          // If no driveDestination, try to build a Drive link from the file name
          if (!recordingUrl && recordingDriveFileId) {
            recordingUrl = `https://drive.google.com/file/d/${recordingDriveFileId}/view`;
          }
        }
      } else {
        const recErr = await recordingsResponse.text();
        console.log('No recordings available:', recordingsResponse.status, recErr);
      }
    } catch (recError) {
      console.warn('Failed to fetch recordings (non-blocking):', recError);
    }

    // Update recording info
    if (recordingUrl || recordingDriveFileId) {
      await supabaseClient.from('google_meet_meetings')
        .update({
          recording_url: recordingUrl,
          recording_drive_file_id: recordingDriveFileId,
        })
        .eq('id', meetingId);
    }

    // Fetch transcripts
    const transcriptsUrl = `https://meet.googleapis.com/v2/${conferenceRecordName}/transcripts`;
    const transcriptsResponse = await fetch(transcriptsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!transcriptsResponse.ok) {
      const errText = await transcriptsResponse.text();
      console.log('No transcripts available yet:', errText);
      await supabaseClient.from('google_meet_meetings')
        .update({ transcript_status: 'not_available' })
        .eq('id', meetingId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Transcrição ainda não disponível. Pode levar de 2 a 5 minutos após o término da reunião.',
          hasRecording: !!recordingUrl,
          recordingUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcriptsData = await transcriptsResponse.json();
    const transcripts = transcriptsData.transcripts || [];

    if (transcripts.length === 0) {
      await supabaseClient.from('google_meet_meetings')
        .update({ transcript_status: 'not_available' })
        .eq('id', meetingId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhuma transcrição encontrada para esta reunião. Verifique se a transcrição estava habilitada durante a reunião.',
          hasRecording: !!recordingUrl,
          recordingUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transcript entries
    const transcriptName = transcripts[0].name;
    const entriesUrl = `https://meet.googleapis.com/v2/${transcriptName}/entries`;
    const entriesResponse = await fetch(entriesUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!entriesResponse.ok) {
      const errText = await entriesResponse.text();
      console.error('Failed to fetch transcript entries:', errText);
      await supabaseClient.from('google_meet_meetings')
        .update({ transcript_status: 'failed' })
        .eq('id', meetingId);
      throw new Error('Failed to fetch transcript entries');
    }

    const entriesData = await entriesResponse.json();
    const entries = entriesData.transcriptEntries || [];

    const rawTranscript = entries
      .map((entry: any) => {
        const speaker = entry.participant?.displayName || 'Unknown';
        const text = entry.text || '';
        const time = entry.startTime || '';
        return `[${time}] ${speaker}: ${text}`;
      })
      .join('\n');

    console.log('Transcript captured, length:', rawTranscript.length);

    await supabaseClient.from('google_meet_meetings')
      .update({
        raw_transcript: rawTranscript,
        transcript_status: 'completed',
        transcript_doc_url: transcripts[0].docsDestination?.document || null,
      })
      .eq('id', meetingId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcrição capturada com sucesso!',
        transcriptLength: rawTranscript.length,
        entriesCount: entries.length,
        hasRecording: !!recordingUrl,
        recordingUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-meet-check-transcript:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
