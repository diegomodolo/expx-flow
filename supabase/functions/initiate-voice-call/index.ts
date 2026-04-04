import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { companyId, conversationId, phone, contactName } = await req.json();

    if (!companyId || !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "companyId e phone são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Buscar credenciais API4Com da empresa
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("api4com_token, api4com_extension")
      .eq("company_id", companyId)
      .maybeSingle();

    if (configError) throw configError;

    if (!config?.api4com_token || !config?.api4com_extension) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "API4Com não configurada. Acesse Configurações > WhatsApp para configurar.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Criar registro de chamada no banco antes de iniciar
    const { data: callRecord, error: insertError } = await supabase
      .from("voice_calls")
      .insert({
        company_id: companyId,
        conversation_id: conversationId || null,
        phone,
        contact_name: contactName || null,
        direction: "outbound",
        status: "initiated",
        metadata: { conversation_id: conversationId },
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Chamar API4Com
    const api4comResponse = await fetch(
      "https://api.api4com.com/api/v1/dialer",
      {
        method: "POST",
        headers: {
          Authorization: config.api4com_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extension: config.api4com_extension,
          phone,
          metadata: {
            voice_call_id: callRecord.id,
            company_id: companyId,
            conversation_id: conversationId || null,
          },
        }),
      },
    );

    if (!api4comResponse.ok) {
      const errorText = await api4comResponse.text();
      await supabase
        .from("voice_calls")
        .update({ status: "failed" })
        .eq("id", callRecord.id);
      throw new Error(
        `API4Com error (${api4comResponse.status}): ${errorText}`,
      );
    }

    const api4comData = await api4comResponse.json();

    await supabase
      .from("voice_calls")
      .update({
        api4com_call_id: api4comData.id || null,
        status: "ringing",
      })
      .eq("id", callRecord.id);

    console.log(
      `[initiate-voice-call] Chamada iniciada: ${callRecord.id} → ${phone}`,
    );

    return new Response(
      JSON.stringify({ success: true, callId: callRecord.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[initiate-voice-call] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
