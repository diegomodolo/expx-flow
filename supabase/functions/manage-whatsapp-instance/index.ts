import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstancePayload {
  action: "test" | "get_qrcode" | "update_status" | "disconnect" | "delete";
  company_id: string;
  instance_id?: string;
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
    const { action, company_id, instance_id } = payload;

    console.log("[manage-whatsapp-instance] Action:", action, "Company:", company_id, "Instance:", instance_id);

    if (!company_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id e action são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get base config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, uazapi_admintoken")
      .eq("company_id", company_id)
      .single();

    if (configError || !config) {
      console.error("[manage-whatsapp-instance] Config not found:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração base não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");

    // Get instance if instance_id provided
    let instance: any = null;
    if (instance_id) {
      const { data: instanceData, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .single();

      if (instanceError || !instanceData) {
        console.error("[manage-whatsapp-instance] Instance not found:", instanceError);
        return new Response(
          JSON.stringify({ success: false, error: "Instância não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      instance = instanceData;
    }

    if (!instance?.uazapi_token && action !== "delete") {
      return new Response(
        JSON.stringify({ success: false, error: "Token da instância não encontrado. Recrie a instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "test": {
        // Test connection via GET /instance/status with instance token
        const statusUrl = `${cleanEndpoint}/instance/status`;
        console.log("[manage-whatsapp-instance] Testing:", statusUrl);

        const response = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "token": instance.uazapi_token,
          },
        });

        const responseText = await response.text();
        console.log("[manage-whatsapp-instance] Test response:", responseText.substring(0, 500));

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: "Resposta inválida da UazapiGO" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isConnected = data.instance?.status === "connected" || 
                           data.status?.connected === true || 
                           data.connected === true;
        const connectedPhone = data.status?.jid?.user || data.instance?.phone || null;
        const profileName = data.instance?.profileName || null;
        const profilePicUrl = data.instance?.profilePicUrl || null;

        // Update instance status
        await supabase
          .from("whatsapp_instances")
          .update({
            is_connected: isConnected,
            connected_phone: connectedPhone,
            profile_name: profileName,
            profile_pic_url: profilePicUrl,
            status: isConnected ? "connected" : "disconnected",
            last_connection_test: new Date().toISOString(),
          })
          .eq("id", instance_id);

        result = {
          success: true,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          profile_name: profileName,
          profile_pic_url: profilePicUrl,
          status: isConnected ? "connected" : "disconnected",
        };
        break;
      }

      case "get_qrcode": {
        // Get QR code via POST /instance/connect with instance token
        const connectUrl = `${cleanEndpoint}/instance/connect`;
        console.log("[manage-whatsapp-instance] Getting QR code:", connectUrl);

        const response = await fetch(connectUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.uazapi_token,
          },
        });

        const responseText = await response.text();
        console.log("[manage-whatsapp-instance] QR response:", responseText.substring(0, 500));

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: "Resposta inválida da UazapiGO" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if already connected
        if (data.connected === true || data.loggedIn === true) {
          await supabase
            .from("whatsapp_instances")
            .update({
              is_connected: true,
              status: "connected",
              profile_name: data.instance?.profileName || null,
              profile_pic_url: data.instance?.profilePicUrl || null,
              connected_phone: data.status?.jid?.user || null,
              last_connection_test: new Date().toISOString(),
            })
            .eq("id", instance_id);

          result = {
            success: true,
            is_connected: true,
            connected_phone: data.status?.jid?.user,
            profile_name: data.instance?.profileName,
          };
        } else {
          const qrcode = data.instance?.qrcode || data.qrcode;
          const paircode = data.instance?.paircode || data.paircode;

          if (qrcode) {
            await supabase
              .from("whatsapp_instances")
              .update({
                status: "connecting",
                is_connected: false,
                last_connection_test: new Date().toISOString(),
              })
              .eq("id", instance_id);

            result = {
              success: true,
              qr_code: qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`,
              paircode: paircode,
              status: "connecting",
            };
          } else {
            result = {
              success: false,
              error: "Não foi possível obter o QR Code",
            };
          }
        }
        break;
      }

      case "update_status": {
        // Just check and update status via GET /instance/status
        const statusUrl = `${cleanEndpoint}/instance/status`;
        const response = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "token": instance.uazapi_token,
          },
        });

        const data = await response.json();
        const isConnected = data.instance?.status === "connected" || data.status?.connected === true;
        const connectedPhone = data.status?.jid?.user || data.instance?.phone || null;

        await supabase
          .from("whatsapp_instances")
          .update({
            is_connected: isConnected,
            connected_phone: connectedPhone,
            profile_name: data.instance?.profileName || null,
            profile_pic_url: data.instance?.profilePicUrl || null,
            status: isConnected ? "connected" : "disconnected",
            last_connection_test: new Date().toISOString(),
          })
          .eq("id", instance_id);

        result = {
          success: true,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          status: isConnected ? "connected" : "disconnected",
        };
        break;
      }

      case "disconnect": {
        // Disconnect via POST /instance/disconnect with instance token
        const disconnectUrl = `${cleanEndpoint}/instance/disconnect`;
        console.log("[manage-whatsapp-instance] Disconnecting:", disconnectUrl);

        const response = await fetch(disconnectUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.uazapi_token,
          },
        });

        const data = await response.json();
        console.log("[manage-whatsapp-instance] Disconnect response:", data);

        await supabase
          .from("whatsapp_instances")
          .update({
            is_connected: false,
            connected_phone: null,
            profile_name: null,
            profile_pic_url: null,
            status: "disconnected",
            last_connection_test: new Date().toISOString(),
          })
          .eq("id", instance_id);

        result = {
          success: true,
          message: "Instância desconectada",
          status: "disconnected",
        };
        break;
      }

      case "delete": {
        // Delete instance from UazapiGO via DELETE /instance with admintoken
        if (instance?.uazapi_instance_id && config.uazapi_admintoken) {
          const deleteUrl = `${cleanEndpoint}/instance`;
          console.log("[manage-whatsapp-instance] Deleting from UazapiGO:", deleteUrl);

          try {
            await fetch(deleteUrl, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "admintoken": config.uazapi_admintoken,
              },
              body: JSON.stringify({ instanceId: instance.uazapi_instance_id }),
            });
          } catch (deleteError) {
            console.log("[manage-whatsapp-instance] UazapiGO delete failed (non-critical):", deleteError);
          }
        }

        // Soft delete from database
        await supabase
          .from("whatsapp_instances")
          .update({ is_active: false })
          .eq("id", instance_id);

        result = {
          success: true,
          message: "Instância removida",
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
