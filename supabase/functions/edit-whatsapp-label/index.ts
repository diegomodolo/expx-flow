import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EditLabelPayload {
  company_id: string;
  instance_id: string;
  label_id: string;
  name?: string;
  color?: number;
  delete?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: EditLabelPayload = await req.json();
    const { company_id, instance_id, label_id, name, color, delete: shouldDelete } = payload;

    console.log("[edit-whatsapp-label] Editing label:", label_id, "for company:", company_id);

    if (!company_id || !instance_id || !label_id) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id, instance_id e label_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do WhatsApp não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance token
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token")
      .eq("id", instance_id)
      .eq("is_active", true)
      .single();

    if (instanceError || !instance?.uazapi_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Instância não encontrada ou sem token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");
    const url = `${cleanEndpoint}/label/edit`;

    const body: any = { labelid: label_id };
    if (name !== undefined) body.name = name;
    if (color !== undefined) body.color = color;
    if (shouldDelete) body.delete = true;

    console.log("[edit-whatsapp-label] Calling:", url, "with body:", body);

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instance.uazapi_token,
      },
      body: JSON.stringify(body),
    });

    const apiData = await apiResponse.json();
    console.log("[edit-whatsapp-label] Response:", apiData);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: apiData.message || "Erro ao editar etiqueta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: apiData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[edit-whatsapp-label] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
