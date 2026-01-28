import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteChatPayload {
  company_id: string;
  instance_id: string;
  phone: string; // Phone number in international format (e.g., "5511999999999")
  conversation_id?: string; // Optional: to delete from local DB
  delete_chat_db?: boolean; // Delete chat from provider DB
  delete_messages_db?: boolean; // Delete messages from provider DB
  delete_chat_whatsapp?: boolean; // Delete chat from WhatsApp
  delete_local?: boolean; // Delete from our Supabase DB
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: DeleteChatPayload = await req.json();
    const { 
      company_id, 
      instance_id, 
      phone,
      conversation_id,
      delete_chat_db = false,
      delete_messages_db = false,
      delete_chat_whatsapp = true,
      delete_local = true,
    } = payload;

    console.log("[delete-whatsapp-chat] Deleting chat for phone:", phone);
    console.log("[delete-whatsapp-chat] Instance:", instance_id);
    console.log("[delete-whatsapp-chat] Options:", { delete_chat_db, delete_messages_db, delete_chat_whatsapp, delete_local });

    if (!company_id || !instance_id || !phone) {
      console.error("[delete-whatsapp-chat] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, instance_id e phone são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get WhatsApp config for company
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      console.error("[delete-whatsapp-chat] Config not found:", configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração do WhatsApp não encontrada" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get instance token
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, uazapi_token, is_connected")
      .eq("id", instance_id)
      .eq("company_id", company_id)
      .single();

    if (instanceError || !instance) {
      console.error("[delete-whatsapp-chat] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Instância não encontrada" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const instanceToken = instance.uazapi_token;
    const baseUrl = (config.uazapi_endpoint || config.uazapi_base_url)?.replace(/\/$/, "");

    if (!baseUrl || !instanceToken) {
      console.error("[delete-whatsapp-chat] Missing base URL or token");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração incompleta da instância" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let apiSuccess = true;
    let apiData: any = null;

    // Only call provider API if we need to delete from WhatsApp or provider DB
    if (delete_chat_whatsapp || delete_chat_db || delete_messages_db) {
      // Call UazapiGO delete chat endpoint
      // POST /chat/delete
      const deleteUrl = `${baseUrl}/chat/delete`;
      
      const deletePayload = {
        number: phone.replace(/\D/g, ""), // Clean phone number
        deleteChatDB: delete_chat_db,
        deleteMessagesDB: delete_messages_db,
        deleteChatWhatsApp: delete_chat_whatsapp,
      };

      console.log("[delete-whatsapp-chat] Calling API:", deleteUrl);
      console.log("[delete-whatsapp-chat] Payload:", JSON.stringify(deletePayload));

      const apiResponse = await fetch(deleteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken,
        },
        body: JSON.stringify(deletePayload),
      });

      try {
        apiData = await apiResponse.json();
      } catch {
        apiData = null;
      }
      console.log("[delete-whatsapp-chat] API Response:", apiResponse.status, JSON.stringify(apiData));

      if (!apiResponse.ok) {
        console.error("[delete-whatsapp-chat] API error:", apiData);
        apiSuccess = false;
        // Don't fail completely - we might still want to delete locally
      }
    }

    // Delete from our local Supabase DB if requested
    if (delete_local && conversation_id) {
      console.log("[delete-whatsapp-chat] Deleting from local DB, conversation:", conversation_id);

      // First delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from("whatsapp_messages")
        .delete()
        .eq("conversation_id", conversation_id);

      if (messagesError) {
        console.error("[delete-whatsapp-chat] Error deleting messages:", messagesError);
      } else {
        console.log("[delete-whatsapp-chat] Local messages deleted");
      }

      // Then delete the conversation itself
      const { error: conversationError } = await supabase
        .from("whatsapp_conversations")
        .delete()
        .eq("id", conversation_id);

      if (conversationError) {
        console.error("[delete-whatsapp-chat] Error deleting conversation:", conversationError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Erro ao deletar conversa do banco de dados local" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } else {
        console.log("[delete-whatsapp-chat] Local conversation deleted");
      }
    }

    console.log("[delete-whatsapp-chat] Chat deleted successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        api_success: apiSuccess,
        data: apiData,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[delete-whatsapp-chat] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao deletar chat" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
