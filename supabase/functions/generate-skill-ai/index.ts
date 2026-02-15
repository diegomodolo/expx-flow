import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("Prompt é obrigatório");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em criar skills para agentes de IA. Dado um prompt do usuário descrevendo o que a skill deve fazer, gere a configuração completa da skill.

Responda SOMENTE com a chamada da função generate_skill, sem texto adicional.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_skill",
              description: "Gera a configuração completa de uma skill para agentes de IA",
              parameters: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "ID slug único em snake_case (ex: analyze_competitors)"
                  },
                  name: {
                    type: "string",
                    description: "Nome legível da skill (ex: Analisar Concorrentes)"
                  },
                  description: {
                    type: "string",
                    description: "Descrição curta do que a skill faz"
                  },
                  category: {
                    type: "string",
                    enum: ["data", "action", "generation", "communication", "analysis", "content"],
                    description: "Categoria da skill"
                  },
                  edge_function: {
                    type: "string",
                    description: "Nome sugerido para a edge function (kebab-case, ex: analyze-competitors)"
                  },
                  requires_client: {
                    type: "boolean",
                    description: "Se a skill precisa de um cliente vinculado"
                  },
                  model: {
                    type: "string",
                    description: "Modelo de IA sugerido (ex: google/gemini-3-flash-preview)"
                  },
                  system_prompt: {
                    type: "string",
                    description: "System prompt para a IA executar esta skill"
                  },
                  temperature: {
                    type: "number",
                    description: "Temperatura do modelo (0 a 2)"
                  },
                  max_tokens: {
                    type: "integer",
                    description: "Limite de tokens na resposta"
                  },
                  tool_parameters: {
                    type: "object",
                    description: "JSON Schema dos parâmetros que a skill aceita, com properties e required",
                    properties: {
                      type: { type: "string" },
                      properties: { type: "object" },
                      required: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                required: ["id", "name", "description", "category", "edge_function", "requires_client", "tool_parameters"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_skill" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou a skill estruturada");
    }

    const skillData = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments) 
      : toolCall.function.arguments;

    return new Response(JSON.stringify({ success: true, skill: skillData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating skill:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
