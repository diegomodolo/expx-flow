import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfigureWebhookPayload {
  instance_id: string;
  receive_group_messages?: boolean;
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
    const payload: ConfigureWebhookPayload = await req.json();
    const { instance_id, receive_group_messages = false } = payload;

    console.log("[configure-uazapi-webhook] Configurando webhook para instância:", instance_id);

    if (!instance_id) {
      return new Response(
        JSON.stringify({ success: false, error: "instance_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, company_id, uazapi_token, uazapi_instance_id, instance_name")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      console.error("[configure-uazapi-webhook] Instância não encontrada:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração da empresa (endpoint base)
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint")
      .eq("company_id", instance.company_id)
      .single();

    if (configError || !config) {
      console.error("[configure-uazapi-webhook] Config não encontrada:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração base não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const webhookCallbackUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

    console.log("[configure-uazapi-webhook] Endpoint UazapiGO:", cleanEndpoint);
    console.log("[configure-uazapi-webhook] Webhook callback URL:", webhookCallbackUrl);

    // Identificador da instância para endpoints por instância
    const instanceIdentifier = instance.uazapi_instance_id || instance.instance_name;

    // Configuração específica do UazapiGO conforme documentação:
    // - events: "messages" para escutar mensagens
    // - exclude: evitar loops (wasSentByApi) e opcionalmente grupos (isGroupYes)
    const excludeList = ["wasSentByApi"];
    if (!receive_group_messages) {
      excludeList.push("isGroupYes");
    }
    
    console.log("[configure-uazapi-webhook] Receber grupos:", receive_group_messages);
    console.log("[configure-uazapi-webhook] Exclude list:", excludeList);

    const webhookPayload = {
      url: webhookCallbackUrl,
      events: ["messages"],
      excludeMessages: excludeList,
      enabled: true,
    };

    console.log("[configure-uazapi-webhook] Payload enviado:", JSON.stringify(webhookPayload));

    let webhookConfigured = false;
    let successResponse: any = null;
    const attemptLogs: string[] = [];

    // Tentar criar/atualizar webhook usando diferentes métodos
    const webhookEndpointsWithMethods = [
      // PUT para atualizar webhook existente
      { url: `${cleanEndpoint}/webhook`, method: "PUT" },
      // POST para criar novo
      { url: `${cleanEndpoint}/webhook`, method: "POST" },
      // PUT por instância
      { url: `${cleanEndpoint}/webhook/${instanceIdentifier}`, method: "PUT" },
      // POST por instância
      { url: `${cleanEndpoint}/webhook/${instanceIdentifier}`, method: "POST" },
    ];

    for (const endpoint of webhookEndpointsWithMethods) {
      try {
        console.log(`[configure-uazapi-webhook] Tentando: ${endpoint.method} ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "token": instance.uazapi_token,
          },
          body: JSON.stringify(webhookPayload),
        });

        const responseText = await response.text();
        console.log(`[configure-uazapi-webhook] Status: ${response.status}, Response: ${responseText.substring(0, 500)}`);

        if (response.ok) {
          webhookConfigured = true;
          try {
            successResponse = JSON.parse(responseText);
          } catch {
            successResponse = { raw: responseText };
          }
          attemptLogs.push(`✅ ${endpoint.url}: ${response.status}`);
          break;
        } else {
          attemptLogs.push(`❌ ${endpoint.url}: ${response.status} - ${responseText.substring(0, 100)}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        attemptLogs.push(`❌ ${endpoint.url}: Error - ${errorMsg}`);
        console.error(`[configure-uazapi-webhook] Erro em ${endpoint.url}:`, err);
      }
    }

    if (webhookConfigured) {
      console.log("[configure-uazapi-webhook] Webhook configurado com sucesso!");
      
      // Atualizar instância para marcar que webhook foi configurado E salvar preferência de grupos
      await supabase
        .from("whatsapp_instances")
        .update({ 
          status: "connected",
          receive_group_messages: receive_group_messages,
          updated_at: new Date().toISOString() 
        })
        .eq("id", instance_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Webhook configurado com sucesso",
          webhook_url: webhookCallbackUrl,
          response: successResponse,
          attempts: attemptLogs,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("[configure-uazapi-webhook] Falha em todas as tentativas de configurar webhook");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível configurar o webhook em nenhum endpoint",
          attempts: attemptLogs,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("[configure-uazapi-webhook] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
