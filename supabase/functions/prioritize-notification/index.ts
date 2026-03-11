import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const {
      message_content,
      sender_name,
      channel_name,
      channel_type,
      company_id,
      user_id,
      channel_id,
      message_id,
    } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Use AI to analyze the message priority
    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Você é um sistema de priorização de notificações para uma agência de marketing digital.
Analise a mensagem e determine:
1. priority: "urgent", "high", "normal" ou "low"
2. should_notify: true ou false (se vale a pena notificar o usuário)
3. reason: breve explicação (máx 50 palavras)

Critérios:
- URGENT: problemas com campanhas, bugs, clientes insatisfeitos, prazos vencidos
- HIGH: tarefas atribuídas, menções diretas, pedidos de aprovação
- NORMAL: discussões gerais, atualizações de status
- LOW: cumprimentos, emojis sozinhos, mensagens triviais

Responda APENAS com JSON válido.`,
            },
            {
              role: "user",
              content: `Canal: ${channel_name} (${channel_type})
Remetente: ${sender_name}
Mensagem: ${message_content}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_notification",
                description: "Classifica a prioridade da notificação",
                parameters: {
                  type: "object",
                  properties: {
                    priority: {
                      type: "string",
                      enum: ["urgent", "high", "normal", "low"],
                    },
                    should_notify: { type: "boolean" },
                    reason: { type: "string" },
                  },
                  required: ["priority", "should_notify", "reason"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "classify_notification" },
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);

      if (aiResponse.status === 429 || aiResponse.status === 402) {
        // Fallback: create notification with normal priority
        return await createNotificationFallback(
          company_id,
          user_id,
          channel_id,
          message_id,
          sender_name,
          message_content,
          channel_name,
        );
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let classification = {
      priority: "normal",
      should_notify: true,
      reason: "Classificação padrão",
    };

    if (toolCall?.function?.arguments) {
      try {
        classification = JSON.parse(toolCall.function.arguments);
      } catch {
        console.warn("Failed to parse AI response, using default");
      }
    }

    if (!classification.should_notify) {
      return new Response(
        JSON.stringify({ skipped: true, reason: classification.reason }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create notification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const title =
      classification.priority === "urgent"
        ? `🚨 ${sender_name} em #${channel_name}`
        : classification.priority === "high"
          ? `⚡ ${sender_name} em #${channel_name}`
          : `${sender_name} em #${channel_name}`;

    const { error } = await supabase.from("internal_notifications").insert({
      company_id,
      user_id,
      type: "message",
      title,
      body: message_content.slice(0, 200),
      priority: classification.priority,
      channel_id,
      message_id,
      ai_score:
        classification.priority === "urgent"
          ? 10
          : classification.priority === "high"
            ? 7
            : classification.priority === "normal"
              ? 4
              : 1,
      ai_reason: classification.reason,
    });

    if (error) {
      console.error("DB insert error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        priority: classification.priority,
        reason: classification.reason,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function createNotificationFallback(
  companyId: string,
  userId: string,
  channelId: string,
  messageId: string,
  senderName: string,
  content: string,
  channelName: string,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase.from("internal_notifications").insert({
    company_id: companyId,
    user_id: userId,
    type: "message",
    title: `${senderName} em #${channelName}`,
    body: content.slice(0, 200),
    priority: "normal",
    channel_id: channelId,
    message_id: messageId,
  });

  return new Response(
    JSON.stringify({ success: true, priority: "normal", fallback: true }),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    },
  );
}
