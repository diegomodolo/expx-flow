import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { captions } = await req.json();
    
    if (!captions || !Array.isArray(captions) || captions.length === 0) {
      return new Response(
        JSON.stringify({ error: "captions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const results = [];

    for (const caption of captions) {
      if (!caption || caption.trim() === "") {
        results.push({
          objective: "",
          headline: "",
          subheadline: "",
        });
        continue;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em marketing digital e criação de conteúdo para redes sociais.
Analise a legenda fornecida e gere:
1. Objetivo: Uma frase curta (máximo 10 palavras) que descreva o propósito do post (ex: "Gerar engajamento", "Promover produto", "Educar audiência")
2. Headline: Um título impactante e curto (máximo 8 palavras) que capture a essência do post
3. Subheadline: Uma frase de apoio (máximo 15 palavras) que complemente o headline

Responda APENAS em formato JSON válido, sem markdown ou explicações adicionais.`,
            },
            {
              role: "user",
              content: `Analise esta legenda e gere objetivo, headline e subheadline:\n\n"${caption}"`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_content_metadata",
                description: "Gera metadados de conteúdo a partir da legenda",
                parameters: {
                  type: "object",
                  properties: {
                    objective: {
                      type: "string",
                      description: "Objetivo do post em até 10 palavras",
                    },
                    headline: {
                      type: "string",
                      description: "Título impactante em até 8 palavras",
                    },
                    subheadline: {
                      type: "string",
                      description: "Frase de apoio em até 15 palavras",
                    },
                  },
                  required: ["objective", "headline", "subheadline"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_content_metadata" } },
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status, await response.text());
        results.push({
          objective: "",
          headline: "",
          subheadline: "",
        });
        continue;
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          results.push({
            objective: parsed.objective || "",
            headline: parsed.headline || "",
            subheadline: parsed.subheadline || "",
          });
        } catch {
          results.push({
            objective: "",
            headline: "",
            subheadline: "",
          });
        }
      } else {
        results.push({
          objective: "",
          headline: "",
          subheadline: "",
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-creative-caption error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
