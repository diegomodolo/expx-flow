import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface SlideAnalysis {
  slideNumber: number;
  detectedType: string;
  description: string;
}

interface SlideContent {
  slideNumber: number;
  type: string;
  headline: string;
  bodyText: string;
  visualDescription: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { clientId, images, selectedTheme } = body ?? {};

  if (!clientId || !images || !Array.isArray(images) || images.length === 0) {
    return new Response(JSON.stringify({ error: "Missing required fields: clientId and images array" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[analyze-carousel-slides] Start", { clientId, imagesCount: images.length, hasTheme: !!selectedTheme });

  try {
    // Fetch client data for context
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      throw new Error("Client not found");
    }

    // Build the message content with all images
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add all slide images
    for (const imgUrl of images) {
      if (imgUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: imgUrl },
        });
      }
    }

    if (!selectedTheme) {
      // PHASE 1: Analyze slides and suggest themes
      const analysisPrompt = `Analise estas ${images.length} imagens de um carrossel do Instagram.

PARA CADA SLIDE, identifique:
1. O TIPO de conteúdo (escolha entre: cover, list_item, tip, question, statistic, cta, quote, comparison, step, conclusion)
2. Uma descrição curta do que o slide contém

TAMBÉM sugira 3 NOVOS TEMAS para criar um carrossel similar baseado nesta estrutura e no perfil da marca:
- Marca: ${client.company}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || "Público geral"}
- Briefing: ${client.ai_briefing || "Conteúdo engajante"}

Responda APENAS em JSON válido:
{
  "slideAnalysis": [
    { "slideNumber": 1, "detectedType": "cover", "description": "Slide de capa com título impactante" },
    { "slideNumber": 2, "detectedType": "list_item", "description": "Item de lista numerada" }
  ],
  "themeSuggestions": [
    "Tema 1 sugerido aqui",
    "Tema 2 sugerido aqui", 
    "Tema 3 sugerido aqui"
  ]
}`;

      messageContent.push({ type: "text", text: analysisPrompt });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: messageContent }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[analyze-carousel-slides] AI API error:", response.status, errorText);
        if (response.status === 429) throw new Error("Rate limit (429). Tente novamente em alguns minutos.");
        if (response.status === 402) throw new Error("Créditos de IA esgotados (402). Adicione créditos.");
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const result = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify({
        success: true,
        slideAnalysis: result.slideAnalysis as SlideAnalysis[],
        themeSuggestions: result.themeSuggestions as string[],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // PHASE 2: Generate content for each slide based on selected theme
      const contentPrompt = `Você é um especialista em carrosseis para Instagram.

Analise estas ${images.length} imagens de um carrossel de referência e GERE NOVO CONTEÚDO para o tema:
"${selectedTheme}"

REGRAS IMPORTANTES:
1. MANTENHA A MESMA ESTRUTURA do carrossel original (mesmos tipos de slides na mesma ordem)
2. Para cada slide, identifique o TIPO original e gere conteúdo NOVO que siga esse tipo
3. Textos 100% em português do Brasil
4. Headlines curtas e impactantes (máx 8 palavras)
5. Body text conciso e escaneável

TIPOS DE SLIDES COMUNS:
- cover: Slide de abertura com título impactante
- list_item: Item de uma lista numerada ou com bullets
- tip: Dica ou conselho prático
- question: Pergunta retórica ou provocativa
- statistic: Número ou estatística impactante
- cta: Call-to-action (salve, compartilhe, comente)
- quote: Citação ou frase de efeito
- comparison: Antes/depois ou X vs Y
- step: Passo de um tutorial
- conclusion: Fechamento ou resumo

CONTEXTO DA MARCA:
- Marca: ${client.company}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || "Público geral"}
- Tom de voz: ${client.voice_tone || "Profissional e acessível"}
- Briefing: ${client.ai_briefing || "Conteúdo engajante"}

Responda APENAS em JSON válido:
{
  "theme": "${selectedTheme}",
  "slideContents": [
    {
      "slideNumber": 1,
      "type": "cover",
      "headline": "Headline curta e impactante",
      "bodyText": "Texto complementar se houver",
      "visualDescription": "Descrição do que manter/adaptar visualmente"
    }
  ]
}`;

      messageContent.push({ type: "text", text: contentPrompt });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: messageContent }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[analyze-carousel-slides] AI API error:", response.status, errorText);
        if (response.status === 429) throw new Error("Rate limit (429). Tente novamente em alguns minutos.");
        if (response.status === 402) throw new Error("Créditos de IA esgotados (402). Adicione créditos.");
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const result = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify({
        success: true,
        theme: result.theme,
        slideContents: result.slideContents as SlideContent[],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: any) {
    console.error("[analyze-carousel-slides] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || "Erro ao analisar slides" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
