import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[block-whatsapp-contact] Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, instance_id, phone, block } = await req.json();
    console.log("[block-whatsapp-contact] Request:", { company_id, instance_id, phone, block });

    if (!company_id || !instance_id || !phone || typeof block !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: company_id, instance_id, phone, block" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance configuration
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_url, uazapi_token")
      .eq("id", instance_id)
      .eq("company_id", company_id)
      .single();

    if (instanceError || !instance) {
      console.error("[block-whatsapp-contact] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { uazapi_url: baseUrl, uazapi_token: instanceToken } = instance;

    if (!baseUrl || !instanceToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Instance not configured properly" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, "");
    console.log("[block-whatsapp-contact] Calling API:", { baseUrl, cleanPhone, block });

    // Call the UazapiGO API
    const apiUrl = `${baseUrl.replace(/\/$/, "")}/chat/block`;
    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({
        number: cleanPhone,
        block: block,
      }),
    });

    const responseText = await apiResponse.text();
    console.log("[block-whatsapp-contact] API response status:", apiResponse.status);
    console.log("[block-whatsapp-contact] API response:", responseText);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API error: ${apiResponse.status}`,
          details: responseText 
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { response: responseText };
    }

    const action = block ? "bloqueado" : "desbloqueado";
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Contato ${action} com sucesso`,
        blockList: responseData.blockList || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[block-whatsapp-contact] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
