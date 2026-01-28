import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { company_id, instance_id, phone, mute_end_time } = await req.json();
    const muteEndTime = Number(mute_end_time);

    console.log("[mute-whatsapp-chat] Request:", { company_id, instance_id, phone, mute_end_time: muteEndTime });

    if (!company_id || !instance_id || !phone || Number.isNaN(muteEndTime)) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate mute_end_time value
    const validMuteValues = [0, 8, 168, -1];
    if (!validMuteValues.includes(muteEndTime)) {
      return new Response(
        JSON.stringify({ success: false, error: "Valor de silenciamento inválido. Use: 0, 8, 168 ou -1" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company config for base URL
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint")
      .eq("company_id", company_id)
      .maybeSingle();

    if (configError || !config) {
      console.error("[mute-whatsapp-chat] Config error:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance token
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token")
      .eq("id", instance_id)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error("[mute-whatsapp-chat] Instance error:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = config.uazapi_endpoint?.replace(/\/$/, "");
    const instanceToken = instance.uazapi_token;

    if (!baseUrl || !instanceToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração da API incompleta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format chat identifier for API - must end with @s.whatsapp.net (users) or @g.us (groups)
    const rawNumber = String(phone).trim();
    const formattedNumber = (() => {
      if (rawNumber.includes("@s.whatsapp.net") || rawNumber.includes("@g.us")) return rawNumber;

      // Group ids usually contain a dash (e.g. 123456789-987654321)
      if (rawNumber.includes("-")) {
        const cleaned = rawNumber.replace(/[^\d-]/g, "");
        return `${cleaned}@g.us`;
      }

      const digits = rawNumber.replace(/\D/g, "");
      return `${digits}@s.whatsapp.net`;
    })();

    const muteUrl = `${baseUrl}/chat/mute`;
    console.log("[mute-whatsapp-chat] Calling API:", muteUrl, { number: formattedNumber, muteEndTime });

    const apiResponse = await fetch(muteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({
        number: formattedNumber,
        muteEndTime,
      }),
    });

    const responseText = await apiResponse.text();
    console.log("[mute-whatsapp-chat] API response:", apiResponse.status, responseText);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API retornou ${apiResponse.status}: ${responseText}` 
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const muteLabel = muteEndTime === 0 ? "removido" : 
                      muteEndTime === 8 ? "8 horas" :
                      muteEndTime === 168 ? "1 semana" : "permanente";

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: muteEndTime === 0 ? "Silenciamento removido" : `Chat silenciado por ${muteLabel}`,
        mute_end_time: muteEndTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[mute-whatsapp-chat] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
