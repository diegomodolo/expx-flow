import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Department-specific analysis prompts
const departmentPrompts: Record<string, string> = {
  atendimento_geral: `Você é um coach de atendimento ao cliente. Foco em:
- Resolutividade: O atendente está resolvendo a questão?
- Cordialidade: O tom está adequado?
- Clareza: As explicações estão claras?
- Próximos passos: O que fazer a seguir?`,

  suporte_tecnico: `Você é um coach de suporte técnico. Foco em:
- Gravidade: Qual a urgência do problema?
- Complexidade: Precisa escalar?
- Frustração: O cliente está frustrado?
- Resolução: Caminho para solução?`,

  vendas: `Você é um coach de vendas experiente. Foco em:
- Sinais de compra: O cliente está interessado?
- Objeções: Quais objeções foram levantadas?
- Timing: É hora de fechar?
- Oportunidades: O que pode ser oferecido?`,

  pos_venda: `Você é um coach de pós-venda/customer success. Foco em:
- Satisfação: O cliente está satisfeito?
- Risco de churn: Há sinais de insatisfação?
- Upsell: Há oportunidade de oferecer mais?
- Fidelização: Como fortalecer o relacionamento?`,

  financeiro: `Você é um coach de atendimento financeiro. Foco em:
- Situação: Qual a pendência financeira?
- Negociação: Há espaço para acordo?
- Sensibilidade: Manter tom adequado
- Solução: Caminho para regularização?`,
};

function buildAnalysisPrompt(department: string, objective: string): string {
  const basePrompt = departmentPrompts[department] || departmentPrompts.atendimento_geral;
  
  return `${basePrompt}

Objetivo principal do agente: ${objective || "Resolver a demanda do cliente"}

Analise a conversa e retorne APENAS um JSON válido (sem markdown, sem \`\`\`) no seguinte formato:
{
  "temperature": "positive" | "neutral" | "negative",
  "interpretation": "O que o cliente está querendo/sentindo (máximo 2 frases)",
  "suggestion": "O que o atendente deveria fazer/falar agora (máximo 2 frases)",
  "departmentInsight": {
    "type": "${department}",
    "insight": "Insight específico para o tipo de atendimento (1 frase)",
    "actionItems": ["Ação 1", "Ação 2"] (máximo 3 itens curtos)
  },
  "alerts": ["Alerta se houver algo urgente"] (pode ser array vazio),
  "score": 7 (nota de 0 a 10 avaliando a qualidade do atendimento até agora - considere: cordialidade, clareza, resolutividade, tom adequado, tempo de resposta implícito),
  "needsResponse": true ou false (indica se a última mensagem do cliente REALMENTE precisa de uma resposta do atendente),
  "readyMessage": "Uma mensagem pronta e completa que o atendente pode enviar diretamente ao cliente. Esta mensagem deve ser a resposta ideal para a situação atual, com tom adequado para WhatsApp (conversacional mas profissional). Não use saudações como 'Olá' se a conversa já está em andamento. Seja direto e resolva a demanda do cliente."
}

Critérios para needsResponse:
- TRUE: Cliente fez pergunta, pediu informação, relatou problema, solicitou algo, demonstrou dúvida, fez reclamação
- FALSE: Cliente apenas confirmou/agradeceu (ok, beleza, obrigado, valeu, 👍, perfeito, entendi, certo), despediu-se (tchau, até mais), ou enviou reação/emoji de aprovação

Critérios para a nota (score):
- 0-3: Atendimento ruim (rude, confuso, não resolve)
- 4-6: Atendimento regular (básico, pode melhorar)
- 7-8: Bom atendimento (cordial, claro, encaminha bem)
- 9-10: Excelente (supera expectativas, empático, resolve rápido)

IMPORTANTE sobre readyMessage:
- Escreva como se fosse o atendente falando diretamente com o cliente
- Use emojis moderadamente se apropriado para o contexto
- Seja objetivo mas empático
- A mensagem deve estar pronta para envio imediato

Seja direto e prático. Foque no que é acionável AGORA.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, mode, agentConfig } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle analysis mode
    if (mode === "analyze") {
      console.log("[whatsapp-ai-assistant] Analysis mode - Department:", agentConfig?.department);

      const department = agentConfig?.department || "atendimento_geral";
      const objective = agentConfig?.primary_objective || "resolver_duvida";
      
      const systemPrompt = buildAnalysisPrompt(department, objective);

      // Format conversation for analysis
      const conversationText = messages
        .map((m: { role: string; content: string; timestamp?: string }) => {
          const role = m.role === "customer" ? "CLIENTE" : "ATENDENTE";
          return `${role}: ${m.content}`;
        })
        .join("\n");

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
            { role: "user", content: `Analise esta conversa:\n\n${conversationText}` },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[whatsapp-ai-assistant] AI gateway error:", response.status, errorText);
        
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      console.log("[whatsapp-ai-assistant] Analysis raw response:", content);

      // Parse JSON response
      try {
        // Clean up potential markdown formatting
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();

        const analysis = JSON.parse(cleanContent);

        return new Response(
          JSON.stringify({ analysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("[whatsapp-ai-assistant] Failed to parse analysis:", parseError);
        
        // Return a fallback analysis
        return new Response(
          JSON.stringify({
            analysis: {
              temperature: "neutral",
              interpretation: "Não foi possível interpretar o contexto completo.",
              suggestion: "Continue a conversa normalmente.",
              departmentInsight: {
                type: department,
                insight: "Análise automática indisponível.",
                actionItems: ["Rever a conversa manualmente"],
              },
              alerts: [],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Default chat mode
    console.log("[whatsapp-ai-assistant] Sending request to Lovable AI");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[whatsapp-ai-assistant] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[whatsapp-ai-assistant] Response received successfully");

    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[whatsapp-ai-assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
