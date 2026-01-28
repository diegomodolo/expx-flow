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

    const { company_id, instance_id } = await req.json();

    console.log("[fetch-whatsapp-blocklist] Request:", { company_id, instance_id });

    if (!company_id || !instance_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes" }),
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
      console.error("[fetch-whatsapp-blocklist] Config error:", configError);
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
      console.error("[fetch-whatsapp-blocklist] Instance error:", instanceError);
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

    const blocklistUrl = `${baseUrl}/chat/blocklist`;
    console.log("[fetch-whatsapp-blocklist] Calling API:", blocklistUrl);

    const apiResponse = await fetch(blocklistUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
    });

    const responseText = await apiResponse.text();
    console.log("[fetch-whatsapp-blocklist] API response:", apiResponse.status, responseText);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API retornou ${apiResponse.status}: ${responseText}` 
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { blockList: [] };
    }

    // Format blocked contacts for display
    const blockList = (responseData.blockList || []).map((jid: string) => {
      // Extract phone number from JID (e.g., "5511999999999@s.whatsapp.net" -> "5511999999999")
      const phone = jid.replace(/@s\.whatsapp\.net$/, "").replace(/@g\.us$/, "");
      return {
        jid,
        phone,
        formatted_phone: formatPhoneNumber(phone),
      };
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        blockList,
        count: blockList.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[fetch-whatsapp-blocklist] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPhoneNumber(phone: string): string {
  // Remove country code if present (Brazil = 55)
  const cleaned = phone.replace(/^55/, "");
  
  // Format as (XX) XXXXX-XXXX for Brazilian numbers
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
