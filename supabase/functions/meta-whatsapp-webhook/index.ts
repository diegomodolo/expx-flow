import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

// HMAC-SHA256 signature validation
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = "sha256=" + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: Webhook verification challenge from Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token: token?.substring(0, 10) + "...", challenge });

    if (mode === "subscribe" && token && challenge) {
      // Find company with matching verify token
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: config } = await supabaseAdmin
        .from("whatsapp_configs")
        .select("company_id")
        .eq("meta_webhook_verify_token", token)
        .eq("provider", "meta")
        .maybeSingle();

      if (config) {
        console.log("Webhook verified for company:", config.company_id);
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    console.log("Webhook verification failed");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: Incoming messages from Meta
  if (req.method === "POST") {
    const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET");
    if (!appSecret) {
      console.error("META_WHATSAPP_APP_SECRET not configured");
      return new Response("Server error", { status: 500, headers: corsHeaders });
    }

    const signature = req.headers.get("x-hub-signature-256");
    const rawBody = await req.text();

    // Validate signature
    if (!signature || !(await verifySignature(rawBody, signature, appSecret))) {
      console.error("Invalid signature");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Invalid JSON payload:", e);
      return new Response("Bad Request", { status: 400, headers: corsHeaders });
    }

    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process the payload
    if (payload.object === "whatsapp_business_account") {
      for (const entry of payload.entry || []) {
        const businessAccountId = entry.id;

        // Find company by business account ID
        const { data: config } = await supabaseAdmin
          .from("whatsapp_configs")
          .select("company_id, meta_phone_number_id")
          .eq("meta_business_account_id", businessAccountId)
          .eq("provider", "meta")
          .maybeSingle();

        if (!config) {
          console.log("No config found for business account:", businessAccountId);
          continue;
        }

        // Find the Meta instance for this company
        const { data: metaInstance } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id")
          .eq("company_id", config.company_id)
          .eq("meta_phone_number_id", config.meta_phone_number_id)
          .eq("is_active", true)
          .maybeSingle();

        const instanceId = metaInstance?.id || null;
        console.log("Found Meta instance:", instanceId);

        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const value = change.value;
            const phoneNumberId = value.metadata?.phone_number_id;
            const displayPhone = value.metadata?.display_phone_number;

            // Process incoming messages
            for (const message of value.messages || []) {
              const from = message.from;
              const messageId = message.id;
              const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

              console.log(`Message from ${from} to ${displayPhone}:`, message);

              // Extract message content based on type
              let content = "";
              let messageType = message.type;

              switch (message.type) {
                case "text":
                  content = message.text?.body || "";
                  break;
                case "image":
                case "video":
                case "audio":
                case "document":
                  content = message[message.type]?.caption || `[${message.type}]`;
                  break;
                case "location":
                  content = `📍 ${message.location?.name || "Localização"} (${message.location?.latitude}, ${message.location?.longitude})`;
                  break;
                case "contacts":
                  content = `👤 Contato: ${message.contacts?.[0]?.name?.formatted_name || "Contato"}`;
                  break;
                case "sticker":
                  content = "[sticker]";
                  break;
                case "reaction":
                  content = message.reaction?.emoji || "👍";
                  break;
                default:
                  content = `[${message.type}]`;
              }

              // Format phone for storage
              const formattedPhone = from.startsWith("55") ? from : `55${from}`;
              const remoteJid = from + "@s.whatsapp.net";

              // Find or create conversation
              let { data: conversation } = await supabaseAdmin
                .from("whatsapp_conversations")
                .select("id")
                .eq("company_id", config.company_id)
                .eq("phone", formattedPhone)
                .maybeSingle();

              if (!conversation) {
                // Get contact profile from payload
                const contact = value.contacts?.find((c: any) => c.wa_id === from);
                const profileName = contact?.profile?.name || from;

                const { data: newConv } = await supabaseAdmin
                  .from("whatsapp_conversations")
                  .insert({
                    company_id: config.company_id,
                    instance_id: instanceId, // Now associates with the Meta instance
                    phone: formattedPhone,
                    contact_name: profileName,
                    last_message_at: timestamp,
                    last_message_preview: content.substring(0, 100),
                    unread_count: 1,
                    provider: "meta",
                  })
                  .select("id")
                  .single();

                conversation = newConv;
                console.log("Created new conversation:", conversation?.id);
              } else {
                // Update existing conversation
                await supabaseAdmin
                  .from("whatsapp_conversations")
                  .update({
                    last_message_at: timestamp,
                    last_message_preview: content.substring(0, 100),
                    unread_count: supabaseAdmin.rpc("increment", { value: 1 }),
                    instance_id: instanceId, // Update instance_id if it was null
                    provider: "meta",
                  })
                  .eq("id", conversation.id);
                console.log("Updated conversation:", conversation.id);
              }

              if (conversation) {
                // Insert the message
                await supabaseAdmin.from("whatsapp_messages").insert({
                  conversation_id: conversation.id,
                  message_id: messageId,
                  from_me: false,
                  message_type: messageType,
                  content,
                  timestamp,
                  status: "received",
                  raw_data: message,
                });
                console.log("Inserted message:", messageId);
              }
            }

            // Process status updates
            for (const status of value.statuses || []) {
              const messageId = status.id;
              const statusValue = status.status; // sent, delivered, read, failed

              console.log(`Status update for message ${messageId}: ${statusValue}`);

              // Update message status
              await supabaseAdmin
                .from("whatsapp_messages")
                .update({ status: statusValue })
                .eq("message_id", messageId);
            }
          }
        }
      }
    }

    // Meta expects 200 OK quickly
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
