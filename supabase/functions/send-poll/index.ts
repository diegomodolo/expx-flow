import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PollPayload {
  company_id: string;
  recipient_phone: string;
  question: string;
  options: string[];
  allow_multiple?: boolean;
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
    const payload: PollPayload = await req.json();
    const {
      company_id,
      recipient_phone,
      question,
      options,
      allow_multiple,
      instance_id,
    } = payload;

    console.log("[send-whatsapp-poll] Sending poll for company:", company_id);
    console.log("[send-whatsapp-poll] Recipient:", recipient_phone);
    console.log("[send-whatsapp-poll] Question:", question);
    console.log("[send-whatsapp-poll] Instance ID:", instance_id || "default");

    // Validate required fields
    if (!company_id || !recipient_phone || !question) {
      console.error("[send-whatsapp-poll] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "company_id, recipient_phone e question são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate options array
    if (!Array.isArray(options) || options.length < 2) {
      console.error("[send-whatsapp-poll] Options must have at least 2 items");
      return new Response(
        JSON.stringify({
          success: false,
          error: "options deve ser um array com no mínimo 2 itens",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      console.error("[send-whatsapp-poll] Config not found:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração do WhatsApp não encontrada ou inativa",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Format phone number — preserve group JIDs (@g.us) as-is
    const isGroup = recipient_phone.includes("@g.us");
    let formattedPhone = recipient_phone;
    if (!isGroup) {
      formattedPhone = recipient_phone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }
    }

    // For UazapiGO v2, find the instance to use and get its token
    let instanceToken: string | null = null;
    let usedInstanceId: string | null = null;

    if (instance_id) {
      // Use specific instance
      const { data: instance, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("id, uazapi_token, is_connected")
        .eq("id", instance_id)
        .eq("is_active", true)
        .single();

      if (instanceError || !instance) {
        console.error(
          "[send-whatsapp-poll] Instance not found:",
          instanceError,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "Instância não encontrada ou inativa",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!instance.is_connected) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Instância não está conectada",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
        console.error(
          "[send-whatsapp-poll] No active connected instance found:",
          instanceError,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nenhuma instância ativa e conectada encontrada",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      instanceToken = instance.uazapi_token;
      usedInstanceId = instance.id;
    }

    if (!instanceToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token da instância não encontrado",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Send poll via UazapiGO v2 API — endpoint /send/menu with type "poll"
    const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");
    const uazapiUrl = `${cleanEndpoint}/send/menu`;
    console.log("[send-whatsapp-poll] Calling UazapiGO:", uazapiUrl);

    const uazapiBody = {
      number: formattedPhone,
      type: "poll",
      text: question,
      choices: options,
      selectableCount: allow_multiple ? 0 : 1,
    };

    const apiResponse = await fetch(uazapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken,
      },
      body: JSON.stringify(uazapiBody),
    });

    const apiData = await apiResponse.json();
    console.log("[send-whatsapp-poll] UazapiGO response:", apiData);

    if (!apiResponse.ok) {
      console.error("[send-whatsapp-poll] API error:", apiData);
      return new Response(
        JSON.stringify({
          success: false,
          error: apiData?.message || "Erro ao enviar enquete via UAZAPI",
        }),
        {
          status: apiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const messageId = apiData?.messageId || apiData?.key?.id || null;

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        instance_id: usedInstanceId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[send-whatsapp-poll] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
