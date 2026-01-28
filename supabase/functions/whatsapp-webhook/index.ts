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

    // Check if this is a reaction event (UazapiGO)
    if (isUazapi && (payload.EventType === "reaction" || payload.reaction)) {
      console.log("[whatsapp-webhook] Processing reaction event");
      return await handleReactionEvent(supabase, payload);
    }

    // Check if this is a message edit event (UazapiGO)
    // UazapiGO sends edited messages with EventType: "messages" but includes an "edited" field
    // containing the original message ID
    if (isUazapi && payload.message?.edited) {
      console.log("[whatsapp-webhook] Processing message edit event - edited field:", payload.message.edited);
      return await handleMessageEditEvent(supabase, payload);
    }

    let phone: string | null = null;
    let content: string | null = null;
    let contactName: string | null = null;
    let profilePicUrl: string | null = null;
    let messageType: "text" | "image" | "audio" | "video" | "document" = "text";
    let mediaUrl: string | null = null;
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
        
        // Extract profile picture URL from chat object
        profilePicUrl = chat.imagePreview || chat.image || null;
        
        // Determine message type from messageType/mediaType
        const rawMsgType = (message.messageType || message.mediaType || "").toLowerCase();
        
        if (rawMsgType.includes("image")) {
          messageType = "image";
        } else if (rawMsgType.includes("audio") || rawMsgType.includes("ptt") || rawMsgType.includes("voice")) {
          messageType = "audio";
        } else if (rawMsgType.includes("video")) {
          messageType = "video";
        } else if (rawMsgType.includes("document") || rawMsgType.includes("file")) {
          messageType = "document";
        } else {
          messageType = "text";
        }
        
        // Extract media URL from content object or fileURL
        if (message.content && typeof message.content === "object") {
          mediaUrl = message.content.URL || message.content.url || null;
        }
        if (!mediaUrl && message.fileURL) {
          mediaUrl = message.fileURL;
        }
        
        // Get message content - prioritize actual text content
        if (message.content) {
          if (typeof message.content === "string") {
            content = message.content;
          } else if (message.content.text) {
            content = message.content.text;
          } else if (message.content.caption) {
            content = message.content.caption;
          } else if (message.content.fileName) {
            // For documents, use file name as content
            content = message.content.fileName;
          }
        }
        
        // Fallback to text field or body
        if (!content && message.text) {
          content = message.text;
        }
        
        // If still no content, create placeholder based on message type
        if (!content) {
          switch (messageType) {
            case "image":
              content = "[Imagem]";
              break;
            case "video":
              content = "[Vídeo]";
              break;
            case "audio":
              content = "[Áudio]";
              break;
            case "document":
              // Try to get filename from content object
              const fileName = message.content?.fileName || message.fileName;
              content = fileName ? `📎 ${fileName}` : "[Documento]";
              break;
            default:
              content = "[Mensagem]";
          }
        }
        
        console.log("[whatsapp-webhook] Media info:", { messageType, mediaUrl: mediaUrl?.substring(0, 50), content: content?.substring(0, 50) });
      }
    } else if (isZapi) {
      // Z-API webhook format
      phone = payload.phone?.replace(/\D/g, "");
      content = payload.text?.message || payload.message || "[Mídia]";
      contactName = payload.senderName || payload.chatName || null;
      externalId = payload.messageId || payload.zapiMessageId;
      direction = payload.fromMe ? "outgoing" : "incoming";
      profilePicUrl = payload.profilePicUrl || payload.photo || null;
      
      if (payload.image) {
        messageType = "image";
        mediaUrl = payload.image.imageUrl || payload.image.url;
      } else if (payload.audio) {
        messageType = "audio";
        mediaUrl = payload.audio.audioUrl || payload.audio.url;
      } else if (payload.video) {
        messageType = "video";
        mediaUrl = payload.video.videoUrl || payload.video.url;
      } else if (payload.document) {
        messageType = "document";
        mediaUrl = payload.document.documentUrl || payload.document.url;
        if (payload.document.fileName) {
          content = `📎 ${payload.document.fileName}`;
        }
      }
    }

    console.log("[whatsapp-webhook] Extracted data:", { phone, content: content?.substring(0, 50), direction, contactName, messageType, mediaUrl: mediaUrl?.substring(0, 50) });

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
        .select("id, unread_count, profile_pic_url")
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
        .select("id, unread_count, profile_pic_url")
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

      // Update profile picture if available and different
      if (profilePicUrl && profilePicUrl !== existingConversation.profile_pic_url) {
        updateData.profile_pic_url = profilePicUrl;
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
      // Create new conversation with instance_id and profile pic
      const { data: newConversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          company_id: companyId,
          instance_id: instanceId,
          phone,
          contact_name: contactName,
          profile_pic_url: profilePicUrl,
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

    // Save message with media_url
    const { error: messageError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        direction,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        external_id: externalId,
        status: direction === "outgoing" ? "sent" : "delivered",
        sent_at: new Date().toISOString(),
      });

    if (messageError) {
      console.error("[whatsapp-webhook] Error saving message:", messageError);
      throw messageError;
    }

    console.log("[whatsapp-webhook] Message saved successfully for conversation:", conversationId, "type:", messageType, "hasMedia:", !!mediaUrl);

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

// Handle reaction events from UazapiGO
async function handleReactionEvent(supabase: any, payload: any): Promise<Response> {
  try {
    const reaction = payload.reaction || payload.message?.reaction || {};
    const instanceToken = payload.token || null;
    
    // Extract reaction data
    // UazapiGO reaction format: { key: { id, remoteJid, fromMe }, emoji }
    const reactedMessageId = reaction.key?.id || reaction.messageId || reaction.id;
    const emoji = reaction.emoji || reaction.text || "";
    const fromMe = reaction.key?.fromMe ?? reaction.fromMe ?? false;
    
    console.log("[whatsapp-webhook] Reaction data:", { reactedMessageId, emoji, fromMe });

    if (!reactedMessageId) {
      console.log("[whatsapp-webhook] No message ID in reaction event");
      return new Response(
        JSON.stringify({ success: true, message: "No message ID in reaction" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Find the message by external_id
    const { data: message, error: findError } = await supabase
      .from("whatsapp_messages")
      .select("id, conversation_id, company_id")
      .eq("external_id", reactedMessageId)
      .maybeSingle();

    if (findError) {
      console.error("[whatsapp-webhook] Error finding message:", findError);
      throw findError;
    }

    if (!message) {
      console.log("[whatsapp-webhook] Message not found for reaction:", reactedMessageId);
      return new Response(
        JSON.stringify({ success: true, message: "Message not found" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Update the message with the reaction (empty emoji = remove reaction)
    const { error: updateError } = await supabase
      .from("whatsapp_messages")
      .update({ reaction: emoji || null })
      .eq("id", message.id);

    if (updateError) {
      console.error("[whatsapp-webhook] Error updating reaction:", updateError);
      throw updateError;
    }

    console.log("[whatsapp-webhook] Reaction updated successfully:", { messageId: message.id, emoji });

    return new Response(
      JSON.stringify({ success: true, message: "Reaction updated" }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[whatsapp-webhook] Error handling reaction:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// Handle message edit events from UazapiGO
// UazapiGO sends: message.edited = "ORIGINAL_MESSAGE_ID" and message.content = "new text"
async function handleMessageEditEvent(supabase: any, payload: any): Promise<Response> {
  try {
    const message = payload.message || {};
    const instanceToken = payload.token || null;
    
    // UazapiGO format: message.edited contains the ORIGINAL message ID
    // message.id is the NEW message ID (which we should ignore)
    // message.content or message.text contains the new content
    const originalMessageId = message.edited;
    const newContent = message.content || message.text || "";
    
    // Build the full external_id format used in the database
    // UazapiGO stores external_id as "owner:messageId", e.g., "5521996087371:A570C5FBC84B..."
    const owner = message.owner || payload.owner || "";
    const fullOriginalExternalId = owner ? `${owner}:${originalMessageId}` : originalMessageId;
    
    console.log("[whatsapp-webhook] Edit data:", { 
      originalMessageId, 
      fullOriginalExternalId,
      newContent: newContent?.substring(0, 50),
      newMessageId: message.id || message.messageid
    });

    if (!originalMessageId) {
      console.log("[whatsapp-webhook] No original message ID in edit event");
      return new Response(
        JSON.stringify({ success: true, message: "No message ID in edit event" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Find the original message by external_id (try full format first, then just the ID)
    let existingMessage = null;
    let findError = null;
    
    // Try with full external_id format first (owner:messageId)
    const { data: msg1, error: err1 } = await supabase
      .from("whatsapp_messages")
      .select("id, conversation_id, company_id, content")
      .eq("external_id", fullOriginalExternalId)
      .maybeSingle();
    
    if (msg1) {
      existingMessage = msg1;
    } else {
      // Try with just the message ID (in case it was stored differently)
      const { data: msg2, error: err2 } = await supabase
        .from("whatsapp_messages")
        .select("id, conversation_id, company_id, content")
        .ilike("external_id", `%${originalMessageId}`)
        .maybeSingle();
      
      existingMessage = msg2;
      findError = err2;
    }

    if (findError) {
      console.error("[whatsapp-webhook] Error finding message for edit:", findError);
      throw findError;
    }

    if (!existingMessage) {
      console.log("[whatsapp-webhook] Original message not found for edit:", fullOriginalExternalId, "or", originalMessageId);
      return new Response(
        JSON.stringify({ success: true, message: "Original message not found" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Update the original message with new content and mark as edited
    const { error: updateError } = await supabase
      .from("whatsapp_messages")
      .update({ 
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq("id", existingMessage.id);

    if (updateError) {
      console.error("[whatsapp-webhook] Error updating edited message:", updateError);
      throw updateError;
    }

    // Update conversation preview if this is the last message
    await supabase
      .from("whatsapp_conversations")
      .update({ 
        last_message_preview: newContent.substring(0, 100) 
      })
      .eq("id", existingMessage.conversation_id);

    console.log("[whatsapp-webhook] Message edited successfully:", { messageId: existingMessage.id });

    return new Response(
      JSON.stringify({ success: true, message: "Message edited" }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[whatsapp-webhook] Error handling message edit:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}
