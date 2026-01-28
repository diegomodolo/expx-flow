import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageLabelsPayload {
  company_id: string;
  instance_id: string;
  phone: string;
  label_ids?: string[]; // Set all labels
  add_label_id?: string; // Add single label
  remove_label_id?: string; // Remove single label
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: ManageLabelsPayload = await req.json();
    const { company_id, instance_id, phone, label_ids, add_label_id, remove_label_id } = payload;

    console.log("[manage-whatsapp-chat-labels] Managing labels for phone:", phone);

    if (!company_id || !instance_id || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id, instance_id e phone são obrigatórios" }),
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
    const url = `${cleanEndpoint}/chat/labels`;

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    const body: any = { number: formattedPhone };
    
    // Only one operation at a time
    if (label_ids !== undefined) {
      body.labelids = label_ids;
    } else if (add_label_id !== undefined) {
      body.add_labelid = add_label_id;
    } else if (remove_label_id !== undefined) {
      body.remove_labelid = remove_label_id;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Especifique label_ids, add_label_id ou remove_label_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[manage-whatsapp-chat-labels] Calling:", url, "with body:", body);

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instance.uazapi_token,
      },
      body: JSON.stringify(body),
    });

    const apiData = await apiResponse.json();
    console.log("[manage-whatsapp-chat-labels] Response:", apiData);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: apiData.message || "Erro ao gerenciar etiquetas do chat" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: apiData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[manage-whatsapp-chat-labels] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
