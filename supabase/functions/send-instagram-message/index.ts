import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { company_id, instagram_account_id, ig_user_id, message, conversation_id } = body;

    if (!company_id || !instagram_account_id || !ig_user_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, instagram_account_id, ig_user_id, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the access token using the instagram-token-resolver pattern
    const accessToken = await resolveInstagramAccessToken(supabase, instagram_account_id, company_id);

    // Send message via Meta Graph API (same Send API used for Messenger)
    const metaResponse = await fetch(
      "https://graph.facebook.com/v18.0/me/messages",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: ig_user_id },
          message: { text: message },
          messaging_type: "RESPONSE",
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("[send-instagram-message] Meta API error:", metaData);
      throw new Error(`Meta API error: ${metaData.error?.message || JSON.stringify(metaData)}`);
    }

    console.log("[send-instagram-message] Sent message, mid:", metaData.message_id);

    // Persist the outgoing message
    if (conversation_id) {
      await supabase
        .from("instagram_messages")
        .insert({
          conversation_id,
          company_id,
          direction: "outgoing",
          content: message,
          message_type: "text",
          external_id: metaData.message_id,
          status: "sent",
        });

      // Update conversation preview
      await supabase
        .from("instagram_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: metaData.message_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-instagram-message] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function resolveInstagramAccessToken(
  supabase: any,
  instagramAccountId: string,
  companyId: string
): Promise<string> {
  // Get the instagram account
  const { data: igAccount, error } = await supabase
    .from("instagram_accounts")
    .select("id, instagram_id, username, source, facebook_page_id")
    .eq("id", instagramAccountId)
    .single();

  if (error || !igAccount) {
    throw new Error(`Instagram account not found: ${error?.message}`);
  }

  // Try to get page access token from linked facebook page
  if (igAccount.facebook_page_id) {
    const { data: fbPage } = await supabase
      .from("facebook_pages")
      .select("page_access_token")
      .eq("id", igAccount.facebook_page_id)
      .single();

    if (fbPage?.page_access_token) {
      return fbPage.page_access_token;
    }
  }

  // Try to find a matching page by instagram_business_account_id
  if (igAccount.instagram_id) {
    const { data: matchingPage } = await supabase
      .from("facebook_pages")
      .select("page_access_token")
      .eq("company_id", companyId)
      .eq("instagram_business_account_id", igAccount.instagram_id)
      .eq("is_active", true)
      .single();

    if (matchingPage?.page_access_token) {
      return matchingPage.page_access_token;
    }
  }

  // Fallback: user-level token
  const { data: integration } = await supabase
    .from("facebook_integrations")
    .select("access_token")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .single();

  if (integration?.access_token) {
    return integration.access_token;
  }

  throw new Error("No access token found for Instagram account. Reconnect Facebook in settings.");
}
