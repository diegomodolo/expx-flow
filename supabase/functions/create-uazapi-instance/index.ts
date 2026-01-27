import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInstancePayload {
  company_id: string;
  instance_name: string;
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
    const payload: CreateInstancePayload = await req.json();
    const { company_id, instance_name } = payload;

    console.log("[create-uazapi-instance] Creating instance for company:", company_id);
    console.log("[create-uazapi-instance] Instance name:", instance_name);

    if (!company_id || !instance_name) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id e instance_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get base config with admintoken
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, uazapi_admintoken")
      .eq("company_id", company_id)
      .single();

    if (configError || !config) {
      console.error("[create-uazapi-instance] Config not found:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração base não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.uazapi_endpoint || !config.uazapi_admintoken) {
      return new Response(
        JSON.stringify({ success: false, error: "Endpoint e Admin Token são obrigatórios na configuração base" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = config.uazapi_endpoint.replace(/\/$/, "");

    // Create instance via UazapiGO API v2
    // POST /instance/init with admintoken header
    const initUrl = `${cleanEndpoint}/instance/init`;
    console.log("[create-uazapi-instance] Calling UazapiGO:", initUrl);

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": config.uazapi_admintoken,
      },
      body: JSON.stringify({
        name: instance_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      }),
    });

    const initText = await initResponse.text();
    console.log("[create-uazapi-instance] UazapiGO response status:", initResponse.status);
    console.log("[create-uazapi-instance] UazapiGO response:", initText);

    let initData;
    try {
      initData = JSON.parse(initText);
    } catch {
      console.error("[create-uazapi-instance] Failed to parse UazapiGO response");
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da UazapiGO", raw: initText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!initResponse.ok) {
      console.error("[create-uazapi-instance] UazapiGO error:", initData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: initData.message || initData.error || "Erro ao criar instância na UazapiGO" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract instance data from response
    // UazapiGO v2 returns: { instance: { id, token, status, name } }
    const instanceInfo = initData.instance || initData;
    const uazapiInstanceId = instanceInfo.id || instanceInfo.instanceId || instanceInfo.name;
    const uazapiToken = instanceInfo.token;

    if (!uazapiInstanceId || !uazapiToken) {
      console.error("[create-uazapi-instance] Missing instance data:", initData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Resposta incompleta da UazapiGO - ID ou Token ausente",
          raw: initData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save instance in database
    const { data: dbInstance, error: dbError } = await supabase
      .from("whatsapp_instances")
      .insert({
        company_id,
        instance_name,
        session_id: uazapiInstanceId, // Keep for backward compatibility
        uazapi_instance_id: uazapiInstanceId,
        uazapi_token: uazapiToken,
        status: instanceInfo.status || "disconnected",
        is_active: true,
        is_connected: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[create-uazapi-instance] Database error:", dbError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao salvar instância no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-uazapi-instance] Instance created successfully:", dbInstance.id);

    // Configurar webhook automaticamente
    const webhookCallbackUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    console.log("[create-uazapi-instance] Configurando webhook:", webhookCallbackUrl);

    let webhookConfigured = false;
    // Configuração específica do UazapiGO conforme documentação:
    // - events: "messages" para escutar mensagens
    // - exclude: evitar loops (wasSentByApi) e grupos (isGroupYes)
    const webhookPayload = {
      url: webhookCallbackUrl,
      events: ["messages"],  // UazapiGO espera um array
      excludeMessages: ["wasSentByApi", "isGroupYes"],  // Campo correto da API UazapiGO
      enabled: true,
    };

    // Tentar diferentes endpoints de webhook
    const webhookEndpoints = [
      `${cleanEndpoint}/webhook`,
      `${cleanEndpoint}/webhook/${uazapiInstanceId}`,
    ];

    for (const webhookUrl of webhookEndpoints) {
      try {
        console.log(`[create-uazapi-instance] Tentando configurar webhook em: ${webhookUrl}`);
        
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": uazapiToken,
          },
          body: JSON.stringify(webhookPayload),
        });

        const webhookText = await webhookResponse.text();
        console.log(`[create-uazapi-instance] Webhook response (${webhookResponse.status}):`, webhookText);

        if (webhookResponse.ok) {
          webhookConfigured = true;
          console.log("[create-uazapi-instance] Webhook configurado com sucesso!");
          break;
        }
      } catch (webhookErr) {
        console.error(`[create-uazapi-instance] Erro ao configurar webhook em ${webhookUrl}:`, webhookErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instance: {
          id: dbInstance.id,
          instance_name: dbInstance.instance_name,
          uazapi_instance_id: uazapiInstanceId,
          status: instanceInfo.status || "disconnected",
        },
        webhook_configured: webhookConfigured,
        webhook_url: webhookCallbackUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[create-uazapi-instance] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
