import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, token, session, company_id } = await req.json();

    console.log("[test-uazapi-connection] Testing connection for company:", company_id);
    console.log("[test-uazapi-connection] Endpoint:", endpoint);
    console.log("[test-uazapi-connection] Session:", session);

    if (!endpoint || !token || !session) {
      console.error("[test-uazapi-connection] Missing required credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Endpoint, Token e Session são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Clean endpoint URL
    const cleanEndpoint = endpoint.replace(/\/$/, "");

    // Call UazapiGO to get session status
    const uazapiUrl = `${cleanEndpoint}/getSessionState`;
    console.log("[test-uazapi-connection] Calling UazapiGO:", uazapiUrl);

    const response = await fetch(uazapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Token": token,
      },
      body: JSON.stringify({
        session: session,
      }),
    });

    const responseText = await response.text();
    console.log("[test-uazapi-connection] UazapiGO response status:", response.status);
    console.log("[test-uazapi-connection] UazapiGO response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[test-uazapi-connection] Failed to parse UazapiGO response");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Resposta inválida da UazapiGO" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!response.ok) {
      console.error("[test-uazapi-connection] UazapiGO error:", data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || data.error || "Erro ao conectar com UazapiGO" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check connection status - UazapiGO returns state as "CONNECTED" or other values
    const isConnected = data.state === "CONNECTED" || data.status === "CONNECTED";
    const connectedPhone = data.phone || data.id?.user?.replace("@c.us", "") || null;

    console.log("[test-uazapi-connection] Connection status:", { isConnected, connectedPhone });

    // Update config in database if company_id provided
    if (company_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      console.log("[test-uazapi-connection] Updating database config");

      const { error: updateError } = await supabase
        .from("whatsapp_configs")
        .upsert({
          company_id,
          provider: "uazapi",
          uazapi_endpoint: cleanEndpoint,
          uazapi_token: token,
          uazapi_session: session,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          last_connection_test: new Date().toISOString(),
          is_active: isConnected,
        }, {
          onConflict: "company_id"
        });

      if (updateError) {
        console.error("[test-uazapi-connection] Database update error:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_connected: isConnected,
        connected_phone: connectedPhone,
        status: data,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[test-uazapi-connection] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao testar conexão" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
