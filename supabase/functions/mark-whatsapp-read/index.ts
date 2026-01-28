import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarkReadPayload {
  company_id: string;
  instance_id: string;
  conversation_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: MarkReadPayload = await req.json();
    const { company_id, instance_id, conversation_id } = payload;

    console.log("[mark-whatsapp-read] Marking messages as read for conversation:", conversation_id);

    if (!company_id || !instance_id || !conversation_id) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id, instance_id e conversation_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("[mark-whatsapp-read] Config not found:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do WhatsApp não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("[mark-whatsapp-read] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceToken = instance.uazapi_token;
    const baseUrl = (config.uazapi_endpoint || config.uazapi_base_url)?.replace(/\/$/, "");

    if (!baseUrl || !instanceToken) {
      console.error("[mark-whatsapp-read] Missing base URL or token");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração incompleta da instância" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all incoming messages with external_id for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from("whatsapp_messages")
      .select("id, external_id")
      .eq("conversation_id", conversation_id)
      .eq("direction", "incoming")
      .not("external_id", "is", null);

    if (messagesError) {
      console.error("[mark-whatsapp-read] Error fetching messages:", messagesError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao buscar mensagens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      console.log("[mark-whatsapp-read] No messages to mark as read");
      // Still reset the unread count locally
      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversation_id);

      return new Response(
        JSON.stringify({ success: true, marked: 0, message: "Nenhuma mensagem para marcar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract external IDs (remove the owner: prefix if present)
    const messageIds = messages
      .map(m => {
        const extId = m.external_id || "";
        // UazapiGO format: "owner:messageId" - we need just the messageId part
        const parts = extId.split(":");
        return parts.length > 1 ? parts[1] : extId;
      })
      .filter(id => id && id.length > 10); // Filter out invalid IDs

    if (messageIds.length === 0) {
      console.log("[mark-whatsapp-read] No valid message IDs found");
      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversation_id);

      return new Response(
        JSON.stringify({ success: true, marked: 0, message: "Nenhum ID válido para marcar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[mark-whatsapp-read] Marking", messageIds.length, "messages as read");

    // Call UazapiGO markread endpoint
    const markReadUrl = `${baseUrl}/message/markread`;
    
    const apiResponse = await fetch(markReadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({ id: messageIds }),
    });

    let apiData: any = null;
    try {
      apiData = await apiResponse.json();
    } catch {
      apiData = null;
    }

    console.log("[mark-whatsapp-read] API Response:", apiResponse.status, JSON.stringify(apiData));

    // Even if API call fails, reset local unread count
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversation_id);

    if (!apiResponse.ok) {
      console.error("[mark-whatsapp-read] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData?.message || apiData?.error || "Erro ao marcar mensagens na API",
          localUpdated: true 
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[mark-whatsapp-read] Messages marked as read successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        marked: messageIds.length,
        data: apiData 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[mark-whatsapp-read] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
