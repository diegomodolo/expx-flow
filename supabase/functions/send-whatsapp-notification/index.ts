import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  company_id: string;
  recipient_phone: string;
  message: string;
  notification_type: string;
  related_entity_type?: string;
  related_entity_id?: string;
  instance_id?: string; // Optional: specific instance to use
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
    const payload: NotificationPayload = await req.json();
    const { 
      company_id, 
      recipient_phone, 
      message, 
      notification_type,
      related_entity_type,
      related_entity_id,
      instance_id,
    } = payload;

    console.log("[send-whatsapp-notification] Sending notification for company:", company_id);
    console.log("[send-whatsapp-notification] Type:", notification_type);
    console.log("[send-whatsapp-notification] Recipient:", recipient_phone);
    console.log("[send-whatsapp-notification] Instance ID:", instance_id || "default");

    if (!company_id || !recipient_phone || !message) {
      console.error("[send-whatsapp-notification] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, recipient_phone e message são obrigatórios" 
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
      console.error("[send-whatsapp-notification] Config not found:", configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração do WhatsApp não encontrada ou inativa" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if connected
    if (!config.is_connected) {
      console.error("[send-whatsapp-notification] WhatsApp not connected");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp não está conectado" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("whatsapp_notification_preferences")
      .select("*")
      .eq("company_id", company_id)
      .single();

    // Check quiet hours if preferences exist
    if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
        console.log("[send-whatsapp-notification] Quiet hours active, skipping");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Horário de silêncio ativo" 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Format phone number (ensure +55 prefix for Brazil)
    let formattedPhone = recipient_phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from("whatsapp_notification_log")
      .insert({
        company_id,
        recipient_phone: formattedPhone,
        notification_type,
        message_content: message,
        status: "pending",
        related_entity_type,
        related_entity_id,
      })
      .select()
      .single();

    if (logError) {
      console.error("[send-whatsapp-notification] Log creation error:", logError);
    }

    let apiResponse;
    let apiData;
    let usedInstanceId: string | null = null;

    // Determine provider and send message accordingly
    const provider = config.provider || "zapi";
    console.log("[send-whatsapp-notification] Using provider:", provider);

    if (provider === "uazapi") {
      // For UazapiGO, find the instance to use
      let session: string;
      
      if (instance_id) {
        // Use specific instance
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("session_id")
          .eq("id", instance_id)
          .eq("is_active", true)
          .single();
        
        if (instanceError || !instance) {
          console.error("[send-whatsapp-notification] Instance not found:", instanceError);
          return new Response(
            JSON.stringify({ success: false, error: "Instância não encontrada ou inativa" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        session = instance.session_id;
        usedInstanceId = instance_id;
      } else {
        // Find first active instance for the company
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("id, session_id")
          .eq("company_id", company_id)
          .eq("is_active", true)
          .eq("is_connected", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        if (instanceError || !instance) {
          // Fallback to config's uazapi_session if no instances
          if (config.uazapi_session) {
            session = config.uazapi_session;
          } else {
            console.error("[send-whatsapp-notification] No active instance found:", instanceError);
            return new Response(
              JSON.stringify({ success: false, error: "Nenhuma instância ativa encontrada" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          session = instance.session_id;
          usedInstanceId = instance.id;
        }
      }

      // Send via UazapiGO
      const uazapiUrl = `${config.uazapi_endpoint}/sendText`;
      console.log("[send-whatsapp-notification] Calling UazapiGO:", uazapiUrl, "Session:", session);

      apiResponse = await fetch(uazapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": config.uazapi_token,
        },
        body: JSON.stringify({
          session: session,
          number: formattedPhone,
          text: message,
        }),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-notification] UazapiGO response:", apiData);
    } else {
      // Send via Z-API (default)
      const zapiUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`;
      console.log("[send-whatsapp-notification] Calling Z-API:", zapiUrl);

      apiResponse = await fetch(zapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.client_token ? { "Client-Token": config.client_token } : {}),
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-notification] Z-API response:", apiData);
    }

    // Update log entry
    if (logEntry) {
      const updateData: any = {
        status: apiResponse.ok ? "sent" : "failed",
        zapi_message_id: apiData.messageId || apiData.zapiMessageId || apiData.id || null,
      };

      if (!apiResponse.ok) {
        updateData.error_message = apiData.message || apiData.error || "Erro desconhecido";
      }

      await supabase
        .from("whatsapp_notification_log")
        .update(updateData)
        .eq("id", logEntry.id);
    }

    if (!apiResponse.ok) {
      console.error("[send-whatsapp-notification] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData.message || apiData.error || "Erro ao enviar mensagem" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[send-whatsapp-notification] Message sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message_id: apiData.messageId || apiData.zapiMessageId || apiData.id,
        log_id: logEntry?.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[send-whatsapp-notification] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao enviar notificação" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});