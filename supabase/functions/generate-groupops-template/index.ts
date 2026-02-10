import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, type, tone } = await req.json();
    // type: "message" or "poll"
    // tone: casual, professional, provocative, etc.

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const toneLabel = tone || "casual";

    let systemPrompt: string;

    if (type === "poll") {
      systemPrompt = `Você é um especialista em engajamento de comunidades WhatsApp para empresários de software houses.
Gere uma enquete (poll) para WhatsApp baseada no pedido do usuário.

REGRAS:
- A pergunta deve ser provocativa e gerar engajamento
- Tom: ${toneLabel}
- Mínimo 3, máximo 8 opções de resposta
- Opções curtas (máximo 25 caracteres cada)
- Pode usar emojis nas opções
- Use formatação WhatsApp na pergunta (*negrito*, _itálico_)
- Pode usar placeholders como {{nome}}, {{grupo}}, {{empresa}}

Responda usando a função generate_poll.`;
    } else {
      systemPrompt = `Você é um especialista em engajamento de comunidades WhatsApp para empresários de software houses.
Gere uma mensagem de template para WhatsApp baseada no pedido do usuário.

REGRAS:
- Tom: ${toneLabel}
- Use formatação WhatsApp: *negrito*, _itálico_, ~riscado~
- Pode usar emojis
- Pode usar placeholders: {{nome}}, {{grupo}}, {{empresa}}, {{streak}}, {{pontos}}, {{ranking}}, {{dia_semana}}, {{dor_principal}}
- A mensagem deve ser engajante e provocar resposta/interação
- Máximo 500 caracteres

Responda usando a função generate_message.`;
    }

    const tools = type === "poll" ? [
      {
        type: "function",
        function: {
          name: "generate_poll",
          description: "Gera uma enquete com pergunta, título e opções",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título curto do template (máx 60 chars)" },
              question: { type: "string", description: "Pergunta da enquete com formatação WhatsApp" },
              options: {
                type: "array",
                items: { type: "string" },
                description: "Opções de resposta (3-8 itens, máx 25 chars cada)"
              },
              multiple_choice: { type: "boolean", description: "Se permite múltipla escolha" }
            },
            required: ["title", "question", "options", "multiple_choice"],
            additionalProperties: false
          }
        }
      }
    ] : [
      {
        type: "function",
        function: {
          name: "generate_message",
          description: "Gera uma mensagem de template WhatsApp",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título curto do template (máx 60 chars)" },
              body: { type: "string", description: "Corpo da mensagem com formatação WhatsApp" }
            },
            required: ["title", "body"],
            additionalProperties: false
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: type === "poll" ? "generate_poll" : "generate_message" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("AI did not return structured output");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, result, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-groupops-template error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro ao gerar template" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
