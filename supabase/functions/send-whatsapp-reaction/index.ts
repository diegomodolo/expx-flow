import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReactionPayload {
  company_id: string;
  instance_id: string;
  message_id: string; // external_id of the message (key.id from WhatsApp)
  emoji: string; // emoji to react with, empty string to remove reaction
  remote_jid: string; // the chat JID (phone@s.whatsapp.net)
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
    const payload: ReactionPayload = await req.json();
    const { company_id, instance_id, message_id, emoji, remote_jid } = payload;

    console.log("[send-whatsapp-reaction] Sending reaction for company:", company_id);
    console.log("[send-whatsapp-reaction] Instance:", instance_id);
    console.log("[send-whatsapp-reaction] Message ID:", message_id);
    console.log("[send-whatsapp-reaction] Emoji:", emoji);
    console.log("[send-whatsapp-reaction] Remote JID:", remote_jid);

    if (!company_id || !instance_id || !message_id || !remote_jid) {
      console.error("[send-whatsapp-reaction] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "company_id, instance_id, message_id e remote_jid são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      console.error("[send-whatsapp-reaction] Config not found:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração do WhatsApp não encontrada ou inativa",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get instance token
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, uazapi_token, is_connected")
      .eq("id", instance_id)
      .eq("is_active", true)
      .single();

    if (instanceError || !instance) {
      console.error("[send-whatsapp-reaction] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada ou inativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!instance.is_connected) {
      return new Response(
        JSON.stringify({ success: false, error: "Instância não está conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!instance.uazapi_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token da instância não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send reaction via UazapiGO /message/react endpoint
    const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");
    const reactUrl = `${cleanEndpoint}/message/react`;
    console.log("[send-whatsapp-reaction] Calling UazapiGO:", reactUrl);

    const requestBody = {
      id: message_id,
      remoteJid: remote_jid,
      emoji: emoji, // empty string removes the reaction
    };

    console.log("[send-whatsapp-reaction] Request body:", JSON.stringify(requestBody));

    const apiResponse = await fetch(reactUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instance.uazapi_token,
      },
      body: JSON.stringify(requestBody),
    });

    const apiData = await apiResponse.json();
    console.log("[send-whatsapp-reaction] UazapiGO response:", apiData);

    if (!apiResponse.ok) {
      console.error("[send-whatsapp-reaction] API error:", apiData);
      return new Response(
        JSON.stringify({
          success: false,
          error: apiData.message || apiData.error || "Erro ao enviar reação",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[send-whatsapp-reaction] Reaction sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        data: apiData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-whatsapp-reaction] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno ao enviar reação",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
