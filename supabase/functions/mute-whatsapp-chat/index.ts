import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    console.log("[mute-whatsapp-chat] Request:", { company_id, instance_id, phone, mute_end_time });

    if (!company_id || !instance_id || !phone || mute_end_time === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate mute_end_time value
    const validMuteValues = [0, 8, 168, -1];
    if (!validMuteValues.includes(mute_end_time)) {
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

    // Format phone number for API - needs @s.whatsapp.net or @g.us suffix
    const cleanPhone = String(phone).replace(/\D/g, "");
    const formattedNumber = cleanPhone.includes("-") 
      ? `${cleanPhone}@g.us` 
      : `${cleanPhone}@s.whatsapp.net`;

    const muteUrl = `${baseUrl}/chat/mute`;
    console.log("[mute-whatsapp-chat] Calling API:", muteUrl, { number: formattedNumber, muteEndTime: mute_end_time });

    const apiResponse = await fetch(muteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({
        number: formattedNumber,
        muteEndTime: mute_end_time,
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

    const muteLabel = mute_end_time === 0 ? "removido" : 
                      mute_end_time === 8 ? "8 horas" :
                      mute_end_time === 168 ? "1 semana" : "permanente";

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: mute_end_time === 0 ? "Silenciamento removido" : `Chat silenciado por ${muteLabel}`,
        mute_end_time 
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
