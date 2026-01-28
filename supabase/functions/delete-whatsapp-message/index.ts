import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteMessagePayload {
  company_id: string;
  instance_id: string;
  message_id: string; // external_id from UazapiGO
  remote_jid?: string; // phone@s.whatsapp.net (optional)
  from_me?: boolean;
  supabase_message_id?: string; // Optional: to delete from local DB too
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
    const payload: DeleteMessagePayload = await req.json();
    const { 
      company_id, 
      instance_id, 
      message_id, 
      remote_jid,
      from_me,
      supabase_message_id,
    } = payload;

    console.log("[delete-whatsapp-message] Deleting message:", message_id);
    console.log("[delete-whatsapp-message] Instance:", instance_id);
    console.log("[delete-whatsapp-message] Remote JID:", remote_jid || "(not provided)");
    console.log("[delete-whatsapp-message] From me:", typeof from_me === "boolean" ? from_me : "(not provided)");

    // Only these are required by the provider endpoint
    if (!company_id || !instance_id || !message_id) {
      console.error("[delete-whatsapp-message] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, instance_id e message_id são obrigatórios" 
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
      console.error("[delete-whatsapp-message] Config not found:", configError);
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

    // Get instance token
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, uazapi_token, is_connected")
      .eq("id", instance_id)
      .eq("company_id", company_id)
      .single();

    if (instanceError || !instance) {
      console.error("[delete-whatsapp-message] Instance not found:", instanceError);
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

    const instanceToken = instance.uazapi_token;
    // Prefer uazapi_endpoint (same one used by send-whatsapp-notification). Fallback to uazapi_base_url.
    const baseUrl = (config.uazapi_endpoint || config.uazapi_base_url)?.replace(/\/$/, "");

    if (!baseUrl || !instanceToken) {
      console.error("[delete-whatsapp-message] Missing base URL or token");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração incompleta da instância" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Call UazapiGO delete message endpoint
    // POST /message/delete - only requires 'id' field
    // See: https://docs.uazapi.com/endpoint/post/message~delete
    const deleteUrl = `${baseUrl}/message/delete`;
    
    // UazapiGO only requires the message ID
    const deletePayload = {
      id: message_id,
    };

    console.log("[delete-whatsapp-message] Calling API:", deleteUrl);
    console.log("[delete-whatsapp-message] Payload:", JSON.stringify(deletePayload));

    const apiResponse = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // UazapiGO uses the `token` header (same as /send/text)
        "token": instanceToken,
      },
      body: JSON.stringify(deletePayload),
    });

    let apiData: any = null;
    try {
      apiData = await apiResponse.json();
    } catch {
      apiData = null;
    }
    console.log("[delete-whatsapp-message] API Response:", apiResponse.status, JSON.stringify(apiData));

    if (!apiResponse.ok) {
      console.error("[delete-whatsapp-message] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData?.message || apiData?.error || "Erro ao deletar mensagem na API" 
        }),
        { 
          status: apiResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // If we have supabase_message_id, mark message as deleted in local DB
    if (supabase_message_id) {
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({ 
          content: "🚫 Mensagem apagada",
          status: "deleted",
        })
        .eq("id", supabase_message_id);

      if (updateError) {
        console.error("[delete-whatsapp-message] DB update error:", updateError);
        // Don't fail - the message was deleted on WhatsApp
      } else {
        console.log("[delete-whatsapp-message] Local message marked as deleted");
      }
    }

    console.log("[delete-whatsapp-message] Message deleted successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: apiData,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[delete-whatsapp-message] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao deletar mensagem" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
