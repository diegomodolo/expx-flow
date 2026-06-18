import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getSystemConfig,
  resolveCredential,
} from "../_shared/getSystemConfig.ts";
import type { SystemConfigGoogle } from "../_shared/getSystemConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getValidAccessToken(
  supabaseClient: unknown,
  companyId: string,
  userId?: string,
) {
  let integration = null;

  // 1. Try user-specific integration first
  if (userId) {
    const { data } = await supabaseClient
      .from("google_meet_integrations")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    integration = data;
  }

  // 2. Fallback to company integration
  if (!integration) {
    const { data } = await supabaseClient
      .from("google_meet_integrations")
      .select("*")
      .eq("company_id", companyId)
      .is("user_id", null)
      .eq("is_active", true)
      .maybeSingle();
    integration = data;
  }

  if (!integration) {
    throw new Error(
      "Nenhuma integração Google Meet encontrada. Conecte sua conta Google em Perfil > Integrações, ou peça ao administrador para configurar a conta da empresa.",
    );
  }

  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log("Token expired or expiring soon, refreshing...");
    const gCfg = await getSystemConfig<SystemConfigGoogle>(
      supabaseClient as { from: (t: string) => unknown },
      "google",
    );
    const clientId = resolveCredential(
      Deno.env.get("GOOGLE_MEET_CLIENT_ID"),
      gCfg?.meet_client_id,
      "Google Meet Client ID não configurado. Acesse Configurações > Sistema > Google.",
    );
    const clientSecret = resolveCredential(
      Deno.env.get("GOOGLE_MEET_CLIENT_SECRET"),
      gCfg?.meet_client_secret,
      "Google Meet Client Secret não configurado. Acesse Configurações > Sistema > Google.",
    );

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("Token refresh failed:", err);
      throw new Error(
        "Falha ao renovar token Google Meet. Reconecte sua conta em Perfil > Integrações.",
      );
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    await supabaseClient
      .from("google_meet_integrations")
      .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
      .eq("id", integration.id);

    return tokens.access_token;
  }

  return integration.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const {
      title,
      clientId,
      squadId,
      scheduledAt,
      companyId,
      participants,
      timezoneOffset,
    } = await req.json();

    if (!companyId || !title) {
      throw new Error("Missing required fields: companyId, title");
    }

    console.log("Creating Google Meet space for company:", companyId);

    const accessToken = await getValidAccessToken(
      supabaseClient,
      companyId,
      user.id,
    );

    // Create Google Meet Space with auto-recording and auto-transcription enabled
    const meetResponse = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          accessType: "OPEN",
        },
      }),
    });

    if (!meetResponse.ok) {
      const errorText = await meetResponse.text();
      console.error("Google Meet API error:", meetResponse.status, errorText);
      throw new Error(
        `Failed to create Meet space: ${meetResponse.status} - ${errorText}`,
      );
    }

    const space = await meetResponse.json();
    console.log("Meet space created:", space);

    // Convert scheduledAt from local time to UTC using the timezone offset
    let scheduledAtUTC: string | null = null;
    if (scheduledAt) {
      // scheduledAt comes as "YYYY-MM-DDTHH:mm" (local time from browser datetime-local input)
      // timezoneOffset is getTimezoneOffset() in minutes: positive for zones WEST of UTC
      // e.g. UTC-3 (Brasilia) → offset = 180
      // Parsing "YYYY-MM-DDTHH:mm" in Deno treats it as local time, which is UTC in server context.
      // By appending "Z" we force UTC parse, then subtract the offset to get real UTC.
      const offset = timezoneOffset || 0;
      const parsedAsUTC = new Date(scheduledAt + "Z");
      const utcDate = new Date(parsedAsUTC.getTime() - offset * 60 * 1000);
      scheduledAtUTC = utcDate.toISOString();
      console.log(
        "Scheduled at (local):",
        scheduledAt,
        "Offset (min):",
        offset,
        "UTC:",
        scheduledAtUTC,
      );
    }

    // Create Google Calendar event if we have a scheduled time
    let calendarEventId: string | null = null;
    if (scheduledAtUTC) {
      try {
        const startTime = new Date(scheduledAtUTC);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

        const attendees = (participants || [])
          .filter((p: unknown) => p.email)
          .map((p: unknown) => ({
            email: p.email,
            displayName: p.name || undefined,
          }));

        const calendarEvent = {
          summary: title,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          conferenceData: {
            entryPoints: [
              {
                entryPointType: "video",
                uri: space.meetingUri,
                label: space.meetingCode,
              },
            ],
            conferenceSolution: {
              key: { type: "hangoutsMeet" },
              name: "Google Meet",
            },
            conferenceId: space.meetingCode,
          },
          attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 10 },
              { method: "email", minutes: 30 },
            ],
          },
          sendUpdates: "all",
        };

        console.log(
          "Creating Calendar event with",
          attendees.length,
          "attendees",
        );

        const calendarResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(calendarEvent),
          },
        );

        if (calendarResponse.ok) {
          const calEvent = await calendarResponse.json();
          calendarEventId = calEvent.id;
          console.log("Calendar event created:", calendarEventId);
        } else {
          const calError = await calendarResponse.text();
          console.error(
            "Calendar event creation failed (non-blocking):",
            calendarResponse.status,
            calError,
          );
          // Non-blocking: meeting is still created even if calendar fails
        }
      } catch (calErr) {
        console.error("Calendar event creation error (non-blocking):", calErr);
      }
    }

    // Save to database
    const { data: meeting, error: meetingError } = await supabaseClient
      .from("google_meet_meetings")
      .insert({
        company_id: companyId,
        client_id: clientId || null,
        squad_id: squadId || null,
        created_by: user.id,
        google_space_id: space.name || "",
        meeting_uri: space.meetingUri || "",
        meeting_code: space.meetingCode || "",
        title,
        status: "scheduled",
        scheduled_at: scheduledAtUTC || null,
        transcript_status: "pending",
      })
      .select()
      .single();

    if (meetingError) {
      console.error("Failed to save meeting:", meetingError);
      throw meetingError;
    }

    console.log("Meeting saved:", meeting.id);

    // Save participants if provided
    if (
      participants &&
      Array.isArray(participants) &&
      participants.length > 0
    ) {
      try {
        const participantsData = participants.map(
          (p: { name?: string; email?: string; display_name?: string }) => ({
            meeting_id: meeting.id,
            display_name: p.display_name || p.name || p.email || "",
            email: p.email || null,
          }),
        );

        const { error: partError } = await supabaseClient
          .from("google_meet_participants")
          .insert(participantsData);

        if (partError) {
          console.warn(
            "Failed to save participants (non-blocking):",
            partError,
          );
        }
      } catch (partErr) {
        console.warn("Error saving participants (non-blocking):", partErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meeting,
        calendarEventCreated: !!calendarEventId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in google-meet-create:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
