import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArchiveChatPayload {
  company_id: string;
  instance_id: string;
  phone: string;
  conversation_id: string;
  archive: boolean; // true to archive, false to unarchive
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
    const payload: ArchiveChatPayload = await req.json();
    const { company_id, instance_id, phone, conversation_id, archive } = payload;

    console.log("[archive-whatsapp-chat] Phone:", phone);
    console.log("[archive-whatsapp-chat] Instance:", instance_id);
    console.log("[archive-whatsapp-chat] Archive:", archive);

    if (!company_id || !instance_id || !phone || !conversation_id || archive === undefined) {
      console.error("[archive-whatsapp-chat] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, instance_id, phone, conversation_id e archive são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
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
      console.error("[archive-whatsapp-chat] Config not found:", configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração do WhatsApp não encontrada" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      console.error("[archive-whatsapp-chat] Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Instância não encontrada" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Build the API URL for UazapiGO
    const baseUrl = config.uazapi_url?.replace(/\/$/, "");
    const instanceToken = instance.instance_token;

    if (!baseUrl || !instanceToken) {
      console.error("[archive-whatsapp-chat] Missing API configuration");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração da API incompleta" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Call UazapiGO API to archive/unarchive chat
    const archiveUrl = `${baseUrl}/chat/archive`;
    console.log("[archive-whatsapp-chat] Calling API:", archiveUrl);

    const response = await fetch(archiveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instanceToken}`,
      },
      body: JSON.stringify({
        number: phone,
        archive: archive,
      }),
    });

    const responseText = await response.text();
    console.log("[archive-whatsapp-chat] API response status:", response.status);
    console.log("[archive-whatsapp-chat] API response:", responseText);

    if (!response.ok) {
      console.error("[archive-whatsapp-chat] API error:", responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao ${archive ? "arquivar" : "desarquivar"} chat: ${responseText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Update local database
    const { error: updateError } = await supabase
      .from("whatsapp_conversations")
      .update({ is_archived: archive })
      .eq("id", conversation_id);

    if (updateError) {
      console.error("[archive-whatsapp-chat] DB update error:", updateError);
      // Don't fail the request, the provider action was successful
    }

    console.log("[archive-whatsapp-chat] Success!");

    return new Response(
      JSON.stringify({ 
        success: true,
        archived: archive,
        message: archive ? "Chat arquivado com sucesso" : "Chat desarquivado com sucesso"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[archive-whatsapp-chat] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno do servidor" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
