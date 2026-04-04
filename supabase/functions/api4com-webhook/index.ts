import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("[api4com-webhook] Payload recebido:", JSON.stringify(payload));

    // Só processa channel-hangup por enquanto
    if (payload.eventType !== "channel-hangup") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Recuperar voice_call_id do metadata enviado no dialer
    const voiceCallId = payload.metadata?.voice_call_id as string | undefined;

    if (!voiceCallId) {
      console.warn("[api4com-webhook] Nenhum voice_call_id no metadata");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determinar status final baseado no hangupCause
    const hangupCause = payload.hangupCause || "";
    let status = "completed";
    if (hangupCause === "USER_BUSY") status = "busy";
    else if (hangupCause === "UNALLOCATED_NUMBER") status = "failed";
    else if (hangupCause === "ORIGINATOR_CANCEL") status = "cancelled";
    else if (hangupCause === "NO_ANSWER" || hangupCause === "ALLOTTED_TIMEOUT")
      status = "no_answer";

    const { error: updateError } = await supabase
      .from("voice_calls")
      .update({
        status,
        started_at: payload.startedAt
          ? new Date(payload.startedAt).toISOString()
          : null,
        answered_at: payload.answeredAt
          ? new Date(payload.answeredAt).toISOString()
          : null,
        ended_at: payload.endedAt
          ? new Date(payload.endedAt).toISOString()
          : null,
        duration_seconds: payload.duration || null,
        hangup_cause: hangupCause,
        record_url: payload.recordUrl || null,
      })
      .eq("id", voiceCallId);

    if (updateError) {
      console.error(
        "[api4com-webhook] Erro ao atualizar voice_call:",
        updateError,
      );
    } else {
      console.log(
        `[api4com-webhook] voice_call ${voiceCallId} atualizado: ${status} (${payload.duration}s)`,
      );
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api4com-webhook] Error:", error);
    // Always return 200 to prevent API4Com from retrying the webhook
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
