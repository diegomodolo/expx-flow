import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EditMessagePayload {
  company_id: string;
  instance_id: string;
  message_id: string; // external_id from UazapiGO
  new_text: string;
  supabase_message_id?: string; // Optional: to update local DB too
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
    const payload: EditMessagePayload = await req.json();
    const { 
      company_id, 
      instance_id, 
      message_id, 
      new_text,
      supabase_message_id,
    } = payload;

    console.log("[edit-whatsapp-message] Editing message:", message_id);
    console.log("[edit-whatsapp-message] Instance:", instance_id);
    console.log("[edit-whatsapp-message] New text length:", new_text?.length);

    if (!company_id || !instance_id || !message_id || !new_text) {
      console.error("[edit-whatsapp-message] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, instance_id, message_id e new_text são obrigatórios" 
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
      console.error("[edit-whatsapp-message] Config not found:", configError);
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
      console.error("[edit-whatsapp-message] Instance not found:", instanceError);
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
    const baseUrl = (config.uazapi_endpoint || config.uazapi_base_url)?.replace(/\/$/, "");

    if (!baseUrl || !instanceToken) {
      console.error("[edit-whatsapp-message] Missing base URL or token");
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

    // Call UazapiGO edit message endpoint
    // POST /message/edit
    // See: https://docs.uazapi.com/endpoint/post/message~edit
    const editUrl = `${baseUrl}/message/edit`;
    
    const editPayload = {
      id: message_id,
      text: new_text,
    };

    console.log("[edit-whatsapp-message] Calling API:", editUrl);
    console.log("[edit-whatsapp-message] Payload:", JSON.stringify(editPayload));

    const apiResponse = await fetch(editUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify(editPayload),
    });

    let apiData: any = null;
    try {
      apiData = await apiResponse.json();
    } catch {
      apiData = null;
    }
    console.log("[edit-whatsapp-message] API Response:", apiResponse.status, JSON.stringify(apiData));

    if (!apiResponse.ok) {
      console.error("[edit-whatsapp-message] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData?.message || apiData?.error || "Erro ao editar mensagem na API" 
        }),
        { 
          status: apiResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // If we have supabase_message_id, update message content in local DB
    if (supabase_message_id) {
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({ 
          content: new_text,
        })
        .eq("id", supabase_message_id);

      if (updateError) {
        console.error("[edit-whatsapp-message] DB update error:", updateError);
        // Don't fail - the message was edited on WhatsApp
      } else {
        console.log("[edit-whatsapp-message] Local message updated");
      }
    }

    console.log("[edit-whatsapp-message] Message edited successfully");

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
    console.error("[edit-whatsapp-message] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao editar mensagem" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
