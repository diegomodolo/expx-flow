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
  reply_to_message_id?: string; // Optional: message ID to reply to (quoted message)
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
      reply_to_message_id,
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
      // For UazapiGO v2, find the instance to use and get its token
      let instanceToken: string | null = null;
      
      if (instance_id) {
        // Use specific instance
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("id, uazapi_token, is_connected")
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

        if (!instance.is_connected) {
          return new Response(
            JSON.stringify({ success: false, error: "Instância não está conectada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        instanceToken = instance.uazapi_token;
        usedInstanceId = instance.id;
      } else {
        // Find first active and connected instance for the company
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("id, uazapi_token")
          .eq("company_id", company_id)
          .eq("is_active", true)
          .eq("is_connected", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        if (instanceError || !instance) {
          console.error("[send-whatsapp-notification] No active connected instance found:", instanceError);
          return new Response(
            JSON.stringify({ success: false, error: "Nenhuma instância ativa e conectada encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        instanceToken = instance.uazapi_token;
        usedInstanceId = instance.id;
      }

      if (!instanceToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Token da instância não encontrado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send via UazapiGO v2 API
      // POST /send/text with instance token header
      const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");
      const uazapiUrl = `${cleanEndpoint}/send/text`;
      console.log("[send-whatsapp-notification] Calling UazapiGO:", uazapiUrl);

      const uazapiBody: any = {
        number: formattedPhone,
        text: message,
      };
      
      // Add reply context if provided (UazapiGO uses replyid field)
      if (reply_to_message_id) {
        uazapiBody.replyid = reply_to_message_id;
        console.log("[send-whatsapp-notification] Replying to message:", reply_to_message_id);
      }

      apiResponse = await fetch(uazapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken,
        },
        body: JSON.stringify(uazapiBody),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-notification] UazapiGO response:", apiData);
    } else {
      // Send via Z-API (default)
      const zapiUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`;
      console.log("[send-whatsapp-notification] Calling Z-API:", zapiUrl);

      const zapiBody: any = {
        phone: formattedPhone,
        message: message,
      };
      
      // Add reply context if provided (Z-API uses messageId field)
      if (reply_to_message_id) {
        zapiBody.messageId = reply_to_message_id;
        console.log("[send-whatsapp-notification] Replying to message:", reply_to_message_id);
      }

      apiResponse = await fetch(zapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.client_token ? { "Client-Token": config.client_token } : {}),
        },
        body: JSON.stringify(zapiBody),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-notification] Z-API response:", apiData);
    }

    // Update log entry
    if (logEntry) {
      const updateData: any = {
        status: apiResponse.ok ? "sent" : "failed",
        zapi_message_id: apiData.messageId || apiData.zapiMessageId || apiData.id || apiData.key?.id || null,
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
        message_id: apiData.messageId || apiData.zapiMessageId || apiData.id || apiData.key?.id,
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
