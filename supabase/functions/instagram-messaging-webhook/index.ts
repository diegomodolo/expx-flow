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

  // GET: Webhook verification from Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("[instagram-messaging-webhook] GET verification:", { mode, token });

    if (mode === "subscribe") {
      // Look up the verify token in facebook_pages or a company config
      // We'll check if any instagram account has this verify token
      const { data: igAccount } = await supabase
        .from("instagram_accounts")
        .select("id, company_id")
        .eq("webhook_verify_token", token)
        .single();

      // Fallback: check whatsapp_configs (same Meta app)
      const { data: waConfig } = !igAccount ? await supabase
        .from("whatsapp_configs")
        .select("id")
        .eq("meta_webhook_verify_token", token)
        .single() : { data: null };

      if (igAccount || waConfig) {
        console.log("[instagram-messaging-webhook] Webhook verified!");
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }

      console.log("[instagram-messaging-webhook] Verify token mismatch");
      return new Response("Forbidden", { status: 403 });
    }

    return new Response("OK", { status: 200 });
  }

  // POST: Process incoming events
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[instagram-messaging-webhook] Received:", JSON.stringify(body).substring(0, 500));

      if (body.object !== "instagram") {
        return new Response("Not an Instagram event", { status: 200 });
      }

      for (const entry of body.entry ?? []) {
        const igBusinessAccountId = entry.id; // The IG business account ID

        // Find the instagram account in our system
        const { data: igAccount } = await supabase
          .from("instagram_accounts")
          .select("id, company_id, instagram_id")
          .eq("instagram_id", igBusinessAccountId)
          .single();

        if (!igAccount) {
          console.log(`[instagram-messaging-webhook] No account found for IG ID: ${igBusinessAccountId}`);
          continue;
        }

        for (const messagingEvent of entry.messaging ?? []) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const timestamp = messagingEvent.timestamp;

          // Skip if message is from our own account
          if (senderId === igBusinessAccountId) continue;

          if (messagingEvent.message) {
            const message = messagingEvent.message;
            // Skip echoes (messages sent by our page)
            if (message.is_echo) continue;

            const messageText = message.text ?? null;
            const messageId = message.mid;

            console.log(`[instagram-messaging-webhook] New DM from ${senderId}: ${messageText}`);

            // Upsert conversation
            const { data: conversation, error: convError } = await supabase
              .from("instagram_conversations")
              .upsert({
                company_id: igAccount.company_id,
                instagram_account_id: igAccount.id,
                ig_user_id: senderId,
                last_message_at: new Date(timestamp).toISOString(),
                last_message_preview: messageText?.substring(0, 100),
                unread_count: 1,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "company_id,instagram_account_id,ig_user_id",
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (convError) {
              console.error("[instagram-messaging-webhook] Conversation upsert error:", convError);
              continue;
            }

            // Insert message
            await supabase
              .from("instagram_messages")
              .insert({
                conversation_id: conversation.id,
                company_id: igAccount.company_id,
                direction: "incoming",
                content: messageText,
                message_type: "text",
                external_id: messageId,
                sent_at: new Date(timestamp).toISOString(),
              });

            // Check keyword triggers (only for text messages)
            if (messageText) {
              await checkAndFireKeywordTriggers(supabase, {
                companyId: igAccount.company_id,
                instagramAccountId: igAccount.id,
                conversationId: conversation.id,
                igUserId: senderId,
                messageText,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[instagram-messaging-webhook] Error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function checkAndFireKeywordTriggers(
  supabase: unknown,
  params: {
    companyId: string;
    instagramAccountId: string;
    conversationId: string;
    igUserId: string;
    messageText: string;
  }
) {
  const { companyId, instagramAccountId, conversationId, igUserId, messageText } = params;

  const { data: triggers } = await supabase
    .from("instagram_keyword_triggers")
    .select("*, instagram_automation_flows(*)")
    .eq("company_id", companyId)
    .eq("instagram_account_id", instagramAccountId)
    .eq("is_active", true);

  if (!triggers || triggers.length === 0) return;

  const normalizedText = messageText.toLowerCase().trim();

  for (const trigger of triggers) {
    const keywords: string[] = trigger.keywords ?? [];
    const matchMode: string = trigger.match_mode ?? "any";

    let matched = false;
    let matchedKeyword = "";

    if (matchMode === "exact") {
      const exactMatch = keywords.find((kw) => normalizedText === kw.toLowerCase().trim());
      if (exactMatch) { matched = true; matchedKeyword = exactMatch; }
    } else if (matchMode === "all") {
      matched = keywords.every((kw) => normalizedText.includes(kw.toLowerCase().trim()));
      if (matched) matchedKeyword = keywords.join(", ");
    } else {
      // 'any' (default)
      const anyMatch = keywords.find((kw) => normalizedText.includes(kw.toLowerCase().trim()));
      if (anyMatch) { matched = true; matchedKeyword = anyMatch; }
    }

    if (matched) {
      console.log(`[instagram-messaging-webhook] Trigger matched: "${trigger.trigger_name}" via keyword "${matchedKeyword}"`);

      // Fire automation executor (fire-and-forget)
      supabase.functions.invoke("instagram-automation-executor", {
        body: {
          conversationId,
          triggerId: trigger.id,
          flowId: trigger.flow_id,
          companyId,
          igUserId,
          instagramAccountId,
          matchedKeyword,
        },
      }).catch((err: unknown) => console.error("[instagram-messaging-webhook] Executor invoke error:", err));

      // Only fire the first matching trigger per message
      break;
    }
  }
}
