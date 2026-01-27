import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionPayload {
  // New v2 mode - using instance_id from database
  instance_id?: string;
  // Legacy mode - direct credentials
  endpoint?: string;
  token?: string;
  session?: string;
  company_id?: string;
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
    const payload: TestConnectionPayload = await req.json();
    let { instance_id, endpoint, token, session, company_id } = payload;

    console.log("[test-uazapi-connection] Request:", { instance_id, session, company_id });

    // If instance_id is provided, fetch credentials from database
    if (instance_id) {
      // Fetch instance data
      const { data: instance, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .single();

      if (instanceError || !instance) {
        console.error("[test-uazapi-connection] Instance not found:", instanceError);
        return new Response(
          JSON.stringify({ success: false, error: "Instância não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch config separately to get the endpoint
      const { data: config, error: configError } = await supabase
        .from("whatsapp_configs")
        .select("uazapi_endpoint")
        .eq("company_id", instance.company_id)
        .single();

      if (configError || !config) {
        console.error("[test-uazapi-connection] Config not found:", configError);
        return new Response(
          JSON.stringify({ success: false, error: "Configuração UazapiGO não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      endpoint = config.uazapi_endpoint;
      token = instance.uazapi_token;
      company_id = instance.company_id;
    } else if (company_id && session) {
      // Legacy mode - try to get instance token or use config token
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
        .select("id, uazapi_token")
        .eq("company_id", company_id)
        .eq("session_id", session)
        .single();

      if (instanceBySession) {
        token = instanceBySession.uazapi_token;
        instance_id = instanceBySession.id;
      } else {
        token = config.uazapi_token;
      }
    }

    if (!endpoint || !token) {
      console.error("[test-uazapi-connection] Missing required credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Endpoint e Token são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = endpoint.replace(/\/$/, "");

    // UazapiGO v2 API: GET /instance/status with token header
    const statusUrl = `${cleanEndpoint}/instance/status`;
    console.log("[test-uazapi-connection] Calling UazapiGO:", statusUrl);

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": token,
      },
    });

    const responseText = await response.text();
    console.log("[test-uazapi-connection] UazapiGO response status:", response.status);
    console.log("[test-uazapi-connection] UazapiGO response:", responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[test-uazapi-connection] Failed to parse UazapiGO response");
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da UazapiGO" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      console.error("[test-uazapi-connection] UazapiGO error:", data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || data.error || "Erro ao conectar com UazapiGO" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse UazapiGO v2 response
    // Response structure: { instance: { status, profileName, profilePicUrl }, status: { connected, loggedIn, jid: { user } } }
    const instanceStatus = data.instance?.status || data.status;
    const isConnected = instanceStatus === "connected" || 
                       data.status?.connected === true || 
                       data.status?.loggedIn === true ||
                       data.connected === true;
    
    const connectedPhone = data.status?.jid?.user || 
                          data.instance?.phone || 
                          data.jid?.user?.replace("@s.whatsapp.net", "") || 
                          null;
    
    const profileName = data.instance?.profileName || data.profileName || null;
    const profilePicUrl = data.instance?.profilePicUrl || data.profilePicUrl || null;

    console.log("[test-uazapi-connection] Connection status:", { 
      isConnected, 
      connectedPhone, 
      profileName,
      instanceStatus 
    });

    // Update instance in database
    if (instance_id) {
      const updateData: any = {
        is_connected: isConnected,
        connected_phone: connectedPhone,
        last_connection_test: new Date().toISOString(),
        status: isConnected ? "connected" : "disconnected",
      };

      if (profileName) updateData.profile_name = profileName;
      if (profilePicUrl) updateData.profile_pic_url = profilePicUrl;

      console.log("[test-uazapi-connection] Updating instance:", instance_id);
      
      const { error: updateError } = await supabase
        .from("whatsapp_instances")
        .update(updateData)
        .eq("id", instance_id);

      if (updateError) {
        console.error("[test-uazapi-connection] Database update error:", updateError);
      }
    }

    // Also update main config status
    if (company_id) {
      await supabase
        .from("whatsapp_configs")
        .update({
          is_connected: isConnected,
          connected_phone: connectedPhone,
          last_connection_test: new Date().toISOString(),
        })
        .eq("company_id", company_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_connected: isConnected,
        connected_phone: connectedPhone,
        profile_name: profileName,
        profile_pic_url: profilePicUrl,
        status: instanceStatus,
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[test-uazapi-connection] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno ao testar conexão" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
