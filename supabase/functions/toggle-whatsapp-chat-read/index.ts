import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ToggleReadPayload {
  company_id: string;
  instance_id: string;
  conversation_id: string;
  phone: string;
  read: boolean; // true = mark as read, false = mark as unread
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: ToggleReadPayload = await req.json();
    const { company_id, instance_id, conversation_id, phone, read } = payload;

    console.log("[toggle-whatsapp-chat-read] Request:", { company_id, instance_id, conversation_id, phone, read });

    if (!company_id || !instance_id || !conversation_id || !phone || typeof read !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: "company_id, instance_id, conversation_id, phone e read são obrigatórios" }),
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
      console.error("[toggle-whatsapp-chat-read] Config not found:", configError);
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
      console.error("[toggle-whatsapp-chat-read] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API configuration
    const baseUrl = (config.uazapi_endpoint || config.uazapi_base_url)?.replace(/\/$/, "");
    const instanceToken = instance.uazapi_token;

    if (!baseUrl || !instanceToken) {
      console.error("[toggle-whatsapp-chat-read] Missing API configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração da API incompleta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for the API
    // For users: [número]@s.whatsapp.net (ex: 5511999999999@s.whatsapp.net)
    // For groups: [id-grupo]@g.us (ex: 123456789-987654321@g.us)
    const cleanPhone = String(phone).replace(/\D/g, "");
    const isGroup = phone.includes("@g.us") || phone.includes("-");
    const formattedNumber = isGroup 
      ? (phone.includes("@g.us") ? phone : `${phone}@g.us`)
      : `${cleanPhone}@s.whatsapp.net`;

    console.log("[toggle-whatsapp-chat-read] Calling API:", { formattedNumber, read });

    // Call the provider's /chat/read endpoint
    const readUrl = `${baseUrl}/chat/read`;
    
    const apiResponse = await fetch(readUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({
        number: formattedNumber,
        read: read,
      }),
    });

    let apiData: any = null;
    try {
      apiData = await apiResponse.json();
    } catch {
      apiData = null;
    }

    console.log("[toggle-whatsapp-chat-read] API Response:", apiResponse.status, JSON.stringify(apiData));

    // Update local database
    const newUnreadCount = read ? 0 : 1; // If marking as unread, set count to 1; if read, set to 0
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: newUnreadCount })
      .eq("id", conversation_id);

    if (!apiResponse.ok) {
      console.error("[toggle-whatsapp-chat-read] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData?.message || apiData?.error || "Erro ao atualizar status de leitura",
          localUpdated: true 
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[toggle-whatsapp-chat-read] Status updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        read: read,
        data: apiData 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[toggle-whatsapp-chat-read] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
