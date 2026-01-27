import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QRCodePayload {
  // New v2 mode - using instance_id from database
  instance_id?: string;
  company_id?: string;
  // Legacy mode - direct credentials
  endpoint?: string;
  token?: string;
  session?: string;
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
    const payload: QRCodePayload = await req.json();
    let { instance_id, company_id, endpoint, token, session } = payload;

    console.log("[get-uazapi-qrcode] Request payload:", { instance_id, company_id, session: session || "from instance" });

    // If instance_id is provided, fetch credentials from database
    if (instance_id) {
      const { data: instance, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select(`
          *,
          whatsapp_configs!inner (
            uazapi_endpoint
          )
        `)
        .eq("id", instance_id)
        .single();

      if (instanceError || !instance) {
        console.error("[get-uazapi-qrcode] Instance not found:", instanceError);
        return new Response(
          JSON.stringify({ success: false, error: "Instância não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      endpoint = (instance.whatsapp_configs as any).uazapi_endpoint;
      token = instance.uazapi_token;
      company_id = instance.company_id;
    } else if (company_id && session) {
      // Legacy mode - get token from config or instance
      const { data: config, error: configError } = await supabase
        .from("whatsapp_configs")
        .select("uazapi_endpoint, uazapi_token")
        .eq("company_id", company_id)
        .single();

      if (configError || !config) {
        return new Response(
          JSON.stringify({ success: false, error: "Configuração não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      endpoint = config.uazapi_endpoint;
      
      // Try to find instance by session_id to get the instance-specific token
      const { data: instanceBySession } = await supabase
        .from("whatsapp_instances")
        .select("uazapi_token")
        .eq("company_id", company_id)
        .eq("session_id", session)
        .single();

      token = instanceBySession?.uazapi_token || config.uazapi_token;
    }

    if (!endpoint || !token) {
      console.error("[get-uazapi-qrcode] Missing required credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Endpoint e Token são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = endpoint.replace(/\/$/, "");

    // UazapiGO v2 API: POST /instance/connect with token header (no body = generate QR)
    const connectUrl = `${cleanEndpoint}/instance/connect`;
    console.log("[get-uazapi-qrcode] Calling UazapiGO:", connectUrl);

    const response = await fetch(connectUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token,
      },
    });

    const responseText = await response.text();
    console.log("[get-uazapi-qrcode] UazapiGO response status:", response.status);
    console.log("[get-uazapi-qrcode] UazapiGO response:", responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[get-uazapi-qrcode] Failed to parse response");
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da UazapiGO" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already connected
    // UazapiGO v2 returns: { connected: true/false, loggedIn: true/false, instance: {...} }
    if (data.connected === true || data.loggedIn === true) {
      console.log("[get-uazapi-qrcode] Already connected");
      
      // Update instance status in database
      if (instance_id) {
        await supabase
          .from("whatsapp_instances")
          .update({
            is_connected: true,
            status: "connected",
            profile_name: data.instance?.profileName || null,
            profile_pic_url: data.instance?.profilePicUrl || null,
            connected_phone: data.status?.jid?.user || data.instance?.phone || null,
            last_connection_test: new Date().toISOString(),
          })
          .eq("id", instance_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          is_connected: true,
          connected_phone: data.status?.jid?.user || data.instance?.phone,
          profile_name: data.instance?.profileName,
          message: "WhatsApp já está conectado",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract QR code from response
    // UazapiGO v2 returns QR code in: instance.qrcode or instance.paircode
    const qrcode = data.instance?.qrcode || data.qrcode || data.base64 || data.qr;
    const paircode = data.instance?.paircode || data.paircode;

    if (qrcode) {
      console.log("[get-uazapi-qrcode] QR code received, length:", qrcode.length);
      
      // Update instance status to connecting
      if (instance_id) {
        await supabase
          .from("whatsapp_instances")
          .update({
            status: "connecting",
            is_connected: false,
            last_connection_test: new Date().toISOString(),
          })
          .eq("id", instance_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`,
          paircode: paircode,
          is_image: true,
          status: "connecting",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No QR code in response, try fetching status
    console.log("[get-uazapi-qrcode] No QR code in connect response, checking status");
    
    const statusUrl = `${cleanEndpoint}/instance/status`;
    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "token": token,
      },
    });

    const statusText = await statusResponse.text();
    console.log("[get-uazapi-qrcode] Status response:", statusText.substring(0, 500));

    let statusData;
    try {
      statusData = JSON.parse(statusText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível obter o QR Code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if status response has QR code
    const statusQrcode = statusData.instance?.qrcode || statusData.qrcode;
    if (statusQrcode) {
      return new Response(
        JSON.stringify({
          success: true,
          qrcode: statusQrcode.startsWith("data:") ? statusQrcode : `data:image/png;base64,${statusQrcode}`,
          is_image: true,
          status: "connecting",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if connected from status
    const isConnected = statusData.instance?.status === "connected" ||
                       statusData.status?.connected === true;
    
    if (isConnected) {
      return new Response(
        JSON.stringify({
          success: true,
          is_connected: true,
          connected_phone: statusData.status?.jid?.user || statusData.instance?.phone,
          profile_name: statusData.instance?.profileName,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Não foi possível obter o QR Code. Tente novamente.",
        raw: data,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-uazapi-qrcode] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno ao obter QR Code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
