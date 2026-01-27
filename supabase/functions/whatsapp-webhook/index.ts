import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log("[whatsapp-webhook] Received webhook:", JSON.stringify(payload));

    // Determine provider based on payload structure
    // UazapiGO format: { EventType, instanceName, token, message, chat }
    // Z-API format: { instanceId, phone, text, ... }
    const isUazapi = payload.EventType || payload.instanceName || payload.token;
    const isZapi = payload.instanceId && !payload.EventType;

    let phone: string | null = null;
    let content: string | null = null;
    let contactName: string | null = null;
    let messageType = "text";
    let externalId: string | null = null;
    let session: string | null = null;
    let instanceToken: string | null = null;
    let direction: "incoming" | "outgoing" = "incoming";

    if (isUazapi) {
      // UazapiGO webhook format v2
      // The instance is identified by instanceName or token
      session = payload.instanceName || null;
      instanceToken = payload.token || null;
      
      console.log("[whatsapp-webhook] UazapiGO detected - instanceName:", session, "token:", instanceToken?.substring(0, 8) + "...");

      // Check if this is a message event
      if (payload.EventType === "messages" || payload.message) {
        const message = payload.message || {};
        const chat = payload.chat || {};
        
        // Get phone from message.chatid or chat.phone
        // Format: 5511999999999@s.whatsapp.net or +55 11 99999-9999
        const chatId = message.chatid || message.sender_pn || "";
        const chatPhone = chat.phone || "";
        
        // Extract phone number
        if (chatId) {
          phone = chatId.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
        } else if (chatPhone) {
          phone = chatPhone.replace(/\D/g, "");
        }
        
        // Ignore groups
        if (chatId.includes("@g.us") || chat.wa_isGroup) {
          console.log("[whatsapp-webhook] Ignoring group message");
          return new Response(
            JSON.stringify({ success: true, message: "Group message ignored" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        direction = message.fromMe ? "outgoing" : "incoming";
        externalId = message.id || message.messageid || null;
        contactName = message.senderName || chat.name || chat.wa_contactName || null;
        
        // Get message content
        content = message.content || 
                  message.text ||
                  message.caption ||
                  (message.messageType && message.messageType !== "Conversation" ? `[${message.messageType}]` : null) ||
                  null;
        
        // Determine message type
        const msgType = message.messageType?.toLowerCase() || message.mediaType?.toLowerCase() || "";
        if (msgType.includes("image")) messageType = "image";
        else if (msgType.includes("audio") || msgType.includes("ptt")) messageType = "audio";
        else if (msgType.includes("video")) messageType = "video";
        else if (msgType.includes("document")) messageType = "document";
        else if (msgType.includes("sticker")) messageType = "sticker";
      }
    } else if (isZapi) {
      // Z-API webhook format
      phone = payload.phone?.replace(/\D/g, "");
      content = payload.text?.message || payload.message || "[Mídia]";
      contactName = payload.senderName || payload.chatName || null;
      externalId = payload.messageId || payload.zapiMessageId;
      direction = payload.fromMe ? "outgoing" : "incoming";
      
      if (payload.image) messageType = "image";
      else if (payload.audio) messageType = "audio";
      else if (payload.video) messageType = "video";
      else if (payload.document) messageType = "document";
    }

    console.log("[whatsapp-webhook] Extracted data:", { phone, content: content?.substring(0, 50), direction, contactName });

    if (!phone || !content) {
      console.log("[whatsapp-webhook] Ignoring webhook - no phone or content");
      return new Response(
        JSON.stringify({ success: true, message: "Ignored - no message content" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-webhook] Processing message:", { phone, direction, messageType, contactName });

    // Find company and instance
    let companyId: string | null = null;
    let instanceId: string | null = null;

    if (isUazapi) {
      // Try to find by token first (most reliable)
      if (instanceToken) {
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("id, company_id")
          .eq("uazapi_token", instanceToken)
          .eq("is_active", true)
          .maybeSingle();
        
        if (instance) {
          companyId = instance.company_id;
          instanceId = instance.id;
          console.log("[whatsapp-webhook] Found instance by token");
        }
      }
      
      // Try by instance name/session if not found
      if (!companyId && session) {
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("id, company_id")
          .or(`instance_name.ilike.${session},uazapi_instance_id.eq.${session},session_id.eq.${session}`)
          .eq("is_active", true)
          .maybeSingle();
        
        if (instance) {
          companyId = instance.company_id;
          instanceId = instance.id;
          console.log("[whatsapp-webhook] Found instance by name/session");
        }
      }

      // Legacy fallback to whatsapp_configs
      if (!companyId && session) {
        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("company_id")
          .eq("uazapi_session", session)
          .eq("provider", "uazapi")
          .maybeSingle();
        
        companyId = config?.company_id || null;
        console.log("[whatsapp-webhook] Found company by legacy config");
      }
    } else if (isZapi && payload.instanceId) {
      const { data: config } = await supabase
        .from("whatsapp_configs")
        .select("company_id")
        .eq("instance_id", payload.instanceId)
        .eq("provider", "zapi")
        .maybeSingle();
      
      companyId = config?.company_id || null;
    }

    if (!companyId) {
      console.log("[whatsapp-webhook] Company not found for this session/instance");
      return new Response(
        JSON.stringify({ success: false, error: "Company not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-webhook] Found company:", companyId, "instance:", instanceId);

    // Find or create conversation (considering instance_id)
    let existingConversation;
    
    if (instanceId) {
      // Look for conversation with this specific instance
      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("id, unread_count")
        .eq("company_id", companyId)
        .eq("phone", phone)
        .eq("instance_id", instanceId)
        .maybeSingle();
      existingConversation = data;
    }
    
    // If not found by instance, try by phone only (for backward compatibility)
    if (!existingConversation) {
      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("id, unread_count")
        .eq("company_id", companyId)
        .eq("phone", phone)
        .is("instance_id", null)
        .maybeSingle();
      existingConversation = data;
    }

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
      
      // Update conversation
      const updateData: any = {
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      };
      
      if (contactName && contactName !== phone) {
        updateData.contact_name = contactName;
      }

      // Update instance_id if it was null before
      if (instanceId && !existingConversation.instance_id) {
        updateData.instance_id = instanceId;
      }
      
      if (direction === "incoming") {
        updateData.unread_count = (existingConversation.unread_count || 0) + 1;
      }
      
      await supabase
        .from("whatsapp_conversations")
        .update(updateData)
        .eq("id", conversationId);
    } else {
      // Create new conversation with instance_id
      const { data: newConversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          company_id: companyId,
          instance_id: instanceId,
          phone,
          contact_name: contactName,
          last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100),
          unread_count: direction === "incoming" ? 1 : 0,
        })
        .select("id")
        .single();

      if (convError) {
        console.error("[whatsapp-webhook] Error creating conversation:", convError);
        throw convError;
      }
      
      conversationId = newConversation.id;
    }

    // Save message
    const { error: messageError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        direction,
        content,
        message_type: messageType,
        external_id: externalId,
        status: direction === "outgoing" ? "sent" : "delivered",
        sent_at: new Date().toISOString(),
      });

    if (messageError) {
      console.error("[whatsapp-webhook] Error saving message:", messageError);
      throw messageError;
    }

    console.log("[whatsapp-webhook] Message saved successfully for conversation:", conversationId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[whatsapp-webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
