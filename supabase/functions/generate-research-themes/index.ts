import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  clientId: string;
  companyId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API de IA não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { clientId, companyId } = body;

    if (!clientId || !companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId e companyId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch client data with briefing
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, company, sector, target_audience, objectives, product_name, voice_tone, ai_briefing, campaign_type")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from client data
    let clientContext = `
Cliente: ${client.name}
Empresa: ${client.company}
Setor: ${client.sector}
Produto/Serviço: ${client.product_name || 'Não especificado'}
Público-Alvo: ${client.target_audience || 'Não especificado'}
Objetivos: ${client.objectives || 'Não especificado'}
Tom de Voz: ${client.voice_tone || 'Não especificado'}
Tipo de Campanha: ${client.campaign_type || 'Não especificado'}
`;

    if (client.ai_briefing) {
      clientContext += `\n\nBriefing Completo:\n${client.ai_briefing}`;
    }

    console.log("Generating research themes for client:", client.name);

    const systemPrompt = `Você é um especialista em marketing digital e pesquisa de mercado. Sua tarefa é analisar o briefing de um cliente e gerar temas de pesquisa relevantes que podem ser explorados para criar anúncios eficazes.

Para cada tema, você deve identificar:
1. O tópico principal (tema de pesquisa)
2. A dor/problema do público-alvo relacionado ao tema
3. A oportunidade de comunicação para o anunciante
4. O sentimento predominante (positive, negative, neutral)
5. Uma pontuação de relevância de 1 a 100

Foque em temas que:
- Abordem dores reais do público-alvo
- Possam ser explorados em anúncios criativos
- Tenham potencial de engajamento
- Estejam alinhados com o produto/serviço do cliente

Responda APENAS com um array JSON válido, sem markdown, sem explicações adicionais.`;

    const userPrompt = `Baseado no briefing abaixo, gere exatamente 10 temas de pesquisa relevantes para criação de anúncios.

${clientContext}

Retorne um array JSON com exatamente 10 objetos, cada um com esta estrutura:
{
  "topic": "Título do tema (curto e direto)",
  "pain_point": "Descrição da dor/problema do público (1-2 frases)",
  "opportunity": "Como o anunciante pode explorar isso (1-2 frases)",
  "sentiment": "positive" ou "negative" ou "neutral",
  "relevance_score": número de 1 a 100
}

IMPORTANTE: Retorne APENAS o array JSON, sem markdown, sem \`\`\`, sem explicações.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao comunicar com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response content:", content);

    // Parse the JSON response
    let themes;
    try {
      // Try to extract JSON from the response (handle markdown code blocks if present)
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith("```")) {
        jsonContent = jsonContent.slice(0, -3);
      }
      themes = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content:", content);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar resposta da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(themes)) {
      console.error("AI response is not an array:", themes);
      return new Response(
        JSON.stringify({ success: false, error: "Formato de resposta inválido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated ${themes.length} research themes`);

    return new Response(
      JSON.stringify({
        success: true,
        themes: themes.slice(0, 10), // Ensure max 10 themes
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-research-themes:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar temas",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
