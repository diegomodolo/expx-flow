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
    const { instance_id, token, client_token, company_id } = await req.json();

    console.log("[test-whatsapp-connection] Testing connection for company:", company_id);
    console.log("[test-whatsapp-connection] Instance ID:", instance_id);

    if (!instance_id || !token) {
      console.error("[test-whatsapp-connection] Missing required credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Instance ID e Token são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Call Z-API to get instance status
    const zapiUrl = `https://api.z-api.io/instances/${instance_id}/token/${token}/status`;
    console.log("[test-whatsapp-connection] Calling Z-API:", zapiUrl);

    const response = await fetch(zapiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(client_token ? { "Client-Token": client_token } : {}),
      },
    });

    const responseText = await response.text();
    console.log("[test-whatsapp-connection] Z-API response status:", response.status);
    console.log("[test-whatsapp-connection] Z-API response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[test-whatsapp-connection] Failed to parse Z-API response");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Resposta inválida da Z-API" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!response.ok) {
      console.error("[test-whatsapp-connection] Z-API error:", data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || data.error || "Erro ao conectar com Z-API" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const isConnected = data.connected === true;
    const connectedPhone = data.phone || data.smartphoneConnected || null;

    console.log("[test-whatsapp-connection] Connection status:", { isConnected, connectedPhone });

    // Update config in database if company_id provided
    if (company_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      console.log("[test-whatsapp-connection] Updating database config");

      const { error: updateError } = await supabase
        .from("whatsapp_configs")
        .upsert({
          company_id,
          instance_id,
          token,
          client_token,
          is_connected: isConnected,
          connected_phone: connectedPhone,
          last_connection_test: new Date().toISOString(),
          is_active: isConnected,
        }, {
          onConflict: "company_id"
        });

      if (updateError) {
        console.error("[test-whatsapp-connection] Database update error:", updateError);
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
    console.error("[test-whatsapp-connection] Error:", error);
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