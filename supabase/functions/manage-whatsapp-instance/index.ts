import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstancePayload {
  action: "test" | "get_qrcode" | "update_status";
  company_id: string;
  instance_id?: string;
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
    const payload: InstancePayload = await req.json();
    const { action, company_id, instance_id, endpoint, token, session } = payload;

    console.log("[manage-whatsapp-instance] Action:", action, "Company:", company_id);

    if (!company_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id e action são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get base config if endpoint/token not provided
    let baseEndpoint = endpoint;
    let baseToken = token;

    if (!baseEndpoint || !baseToken) {
      const { data: config, error: configError } = await supabase
        .from("whatsapp_configs")
        .select("uazapi_endpoint, uazapi_token")
        .eq("company_id", company_id)
        .single();

      if (configError || !config) {
        console.error("[manage-whatsapp-instance] Config not found:", configError);
        return new Response(
          JSON.stringify({ success: false, error: "Configuração base não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      baseEndpoint = config.uazapi_endpoint;
      baseToken = config.uazapi_token;
    }

    // Get session from instance if not provided
    let sessionId = session;
    if (!sessionId && instance_id) {
      const { data: instance, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("session_id")
        .eq("id", instance_id)
        .single();

      if (instanceError || !instance) {
        console.error("[manage-whatsapp-instance] Instance not found:", instanceError);
        return new Response(
          JSON.stringify({ success: false, error: "Instância não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sessionId = instance.session_id;
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Session ID é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "test": {
        // Test connection
        const testUrl = `${baseEndpoint}/session/status/${sessionId}`;
        console.log("[manage-whatsapp-instance] Testing:", testUrl);

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Token": baseToken,
          },
        });

        const data = await response.json();
        console.log("[manage-whatsapp-instance] Test response:", data);

        const isConnected = data.state === "CONNECTED" || 
                           data.status === "CONNECTED" || 
                           data.connected === true;
        const connectedPhone = data.phoneNumber || data.phone || data.jid?.replace("@s.whatsapp.net", "") || null;

        // Update instance status
        if (instance_id) {
          await supabase
            .from("whatsapp_instances")
            .update({
              is_connected: isConnected,
              connected_phone: connectedPhone,
              last_connection_test: new Date().toISOString(),
            })
            .eq("id", instance_id);
        }

        result = {
          success: true,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          state: data.state || data.status,
        };
        break;
      }

      case "get_qrcode": {
        // Start session and get QR code
        const startUrl = `${baseEndpoint}/session/start/${sessionId}`;
        console.log("[manage-whatsapp-instance] Starting session:", startUrl);

        // First, try to start the session
        const startResponse = await fetch(startUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Token": baseToken,
          },
          body: JSON.stringify({
            webhook: `${supabaseUrl}/functions/v1/whatsapp-webhook`,
          }),
        });

        const startData = await startResponse.json();
        console.log("[manage-whatsapp-instance] Start response:", startData);

        // Get QR code
        const qrUrl = `${baseEndpoint}/session/qrcode/image/${sessionId}`;
        console.log("[manage-whatsapp-instance] Getting QR code:", qrUrl);

        const qrResponse = await fetch(qrUrl, {
          method: "GET",
          headers: {
            "Token": baseToken,
          },
        });

        if (qrResponse.ok) {
          const contentType = qrResponse.headers.get("content-type");
          
          if (contentType?.includes("image")) {
            // Convert image to base64
            const imageBuffer = await qrResponse.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            result = {
              success: true,
              qr_code: `data:${contentType};base64,${base64}`,
              state: startData.state || "STARTING",
            };
          } else {
            const qrData = await qrResponse.json();
            result = {
              success: true,
              qr_code: qrData.qrcode || qrData.base64 || qrData.data,
              state: startData.state || qrData.state || "STARTING",
            };
          }
        } else {
          // Session might already be connected
          const statusUrl = `${baseEndpoint}/session/status/${sessionId}`;
          const statusResponse = await fetch(statusUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Token": baseToken,
            },
          });
          const statusData = await statusResponse.json();

          if (statusData.state === "CONNECTED" || statusData.status === "CONNECTED") {
            result = {
              success: true,
              is_connected: true,
              connected_phone: statusData.phoneNumber || statusData.phone,
              state: "CONNECTED",
            };
          } else {
            result = {
              success: false,
              error: "Não foi possível obter o QR Code",
              state: statusData.state || "UNKNOWN",
            };
          }
        }
        break;
      }

      case "update_status": {
        // Just check and update status
        const statusUrl = `${baseEndpoint}/session/status/${sessionId}`;
        const response = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Token": baseToken,
          },
        });

        const data = await response.json();
        const isConnected = data.state === "CONNECTED" || data.status === "CONNECTED";
        const connectedPhone = data.phoneNumber || data.phone || null;

        if (instance_id) {
          await supabase
            .from("whatsapp_instances")
            .update({
              is_connected: isConnected,
              connected_phone: connectedPhone,
              last_connection_test: new Date().toISOString(),
            })
            .eq("id", instance_id);
        }

        result = {
          success: true,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          state: data.state || data.status,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[manage-whatsapp-instance] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
