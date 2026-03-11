import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    const { action, code, companyId, redirectUri, userId } = body;

    if (action === "exchange") {
      const clientId = Deno.env.get("GOOGLE_MEET_CLIENT_ID")?.trim();
      const clientSecret = Deno.env.get("GOOGLE_MEET_CLIENT_SECRET")?.trim();

      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth credentials not configured");
      }

      console.log("Exchanging Google Meet OAuth code...");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri?.trim(),
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Token exchange failed:", errorData);
        throw new Error("Failed to exchange code for tokens");
      }

      const tokens = await tokenResponse.json();
      console.log("Tokens received successfully");

      // Fetch user email
      let userEmail = null;
      try {
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          },
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          userEmail = userInfo.email;
        }
      } catch (e) {
        console.warn("Failed to fetch user email:", e);
      }

      const expiresAt = new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString();

      // Check if integration already exists for this user/company combo
      const existingQuery = supabaseClient
        .from("google_meet_integrations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (userId) {
        existingQuery.eq("user_id", userId);
      } else {
        existingQuery.is("user_id", null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      let integration;
      if (existing) {
        const { data, error: updateError } = await supabaseClient
          .from("google_meet_integrations")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
            is_active: true,
            user_email: userEmail,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (updateError) throw updateError;
        integration = data;
      } else {
        const { data, error: insertError } = await supabaseClient
          .from("google_meet_integrations")
          .insert({
            company_id: companyId,
            user_id: userId || null,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
            is_active: true,
            user_email: userEmail,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        integration = data;
      }

      console.log("Google Meet integration saved:", integration.id);

      return new Response(JSON.stringify({ success: true, integration }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refresh_token") {
      const clientId = Deno.env.get("GOOGLE_MEET_CLIENT_ID")?.trim();
      const clientSecret = Deno.env.get("GOOGLE_MEET_CLIENT_SECRET")?.trim();

      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth credentials not configured");
      }

      let query = supabaseClient
        .from("google_meet_integrations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        query = query.is("user_id", null);
      }

      const { data: integration, error: intError } = await query.single();

      if (intError || !integration) {
        throw new Error("Google Meet integration not found");
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
        throw new Error("Failed to refresh token. Please reconnect.");
      }

      const tokens = await tokenResponse.json();
      const newExpiresAt = new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString();

      await supabaseClient
        .from("google_meet_integrations")
        .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
        .eq("id", integration.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Token renovado com sucesso!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in google-meet-oauth:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
