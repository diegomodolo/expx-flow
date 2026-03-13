import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId, companyId, thumbnailColors } = await req.json();

    if (!scriptId) {
      return new Response(
        JSON.stringify({ success: false, error: "scriptId is required" }),
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

    // Fetch script + slides
    const { data: script, error: scriptError } = await supabase
      .from("youtube_scripts")
      .select("title, thumbnail_url")
      .eq("id", scriptId)
      .single();

    if (scriptError || !script) throw new Error("Script not found");

    const { data: slides, error: slidesError } = await supabase
      .from("youtube_script_slides")
      .select("id, slide_order, title, content, visual_suggestion")
      .eq("script_id", scriptId)
      .order("slide_order", { ascending: true });

    if (slidesError) throw slidesError;
    if (!slides || slides.length === 0) throw new Error("No slides found");

    console.log(
      `[generate-slide-design] Designing ${slides.length} slides for: ${script.title}`,
    );

    const slidesContext = slides
      .map(
        (s) =>
          `Slide ${s.slide_order}: "${s.title}" | Conteúdo: ${s.content || "N/A"} | Sugestão visual: ${s.visual_suggestion || "N/A"}`,
      )
      .join("\n");

    const userPrompt = `Você é um designer de apresentações profissional. Analise o conteúdo abaixo e gere instruções detalhadas de design para cada slide de uma apresentação de vídeo do YouTube.

TÍTULO DO VÍDEO: ${script.title}
TOTAL DE SLIDES: ${slides.length}

CORES EXTRAÍDAS DA THUMBNAIL (usar como identidade visual):
${JSON.stringify(thumbnailColors || {}, null, 2)}

SLIDES:
${slidesContext}

LAYOUTS DISPONÍVEIS (escolha o mais adequado para cada slide):
- "cover": Slide de capa. Título gigante, subtítulo, marca. Usar no slide 1.
- "outline": Sumário numerado dos tópicos. Usar no slide 2 se houver 6+ slides.
- "split-bullets": Título grande à esquerda, bullets à direita. Bom para explicações.
- "columns": Título no topo + conteúdo dividido em 2-3 colunas. Bom para comparações.
- "split-accent": Conteúdo à esquerda + bloco colorido à direita com destaque. Bom para conceitos-chave.
- "feature-list": Itens numerados com ícones. Bom para listas de passos ou benefícios.
- "quote": Texto centralizado grande estilo citação. Bom para frases de impacto.
- "split-inverted": Bloco colorido à esquerda com título + lista numerada à direita.
- "closing": Slide final. CTA, agradecimento.

REGRAS DE DESIGN:
1. Títulos devem ser CURTOS e IMPACTANTES (máx 6 palavras). Reescreva se necessário.
2. Bullets devem ser CONCISOS (máx 15 palavras cada). Reescreva se necessário.
3. Máximo 4-5 bullets por slide.
4. Varie os layouts — nunca use o mesmo layout 2x seguidas.
5. Escolha o layout que melhor comunica AQUELE conteúdo específico.
6. Para slides com frase de impacto, use "quote".
7. Para slides com lista de passos/etapas, use "feature-list".
8. Para slides com conceito principal + explicação, use "split-bullets" ou "split-accent".
9. O primeiro slide DEVE ser "cover" e o último "closing".
10. Adicione um campo "highlight" com a palavra ou frase mais importante do slide para receber destaque visual.

Retorne JSON com este formato exato:
{
  "slides": [
    {
      "slideId": "id-do-slide",
      "layout": "cover",
      "title": "Título Reescrito.",
      "subtitle": "Subtítulo opcional",
      "bullets": ["Bullet 1 conciso", "Bullet 2 conciso"],
      "highlight": "palavra ou frase destaque",
      "accentText": "texto curto para bloco de destaque (se layout split-accent)"
    }
  ]
}`;

    const aiResult = await callAI({
      functionName: "generate-slide-design",
      companyId,
      systemPrompt:
        "Você é um designer de apresentações premium. Retorne apenas JSON válido, sem markdown.",
      userPrompt,
      maxTokens: 3000,
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    const design = JSON.parse(aiResult.content);

    console.log(
      `[generate-slide-design] Design generated with ${design.slides?.length || 0} slides`,
    );

    return new Response(
      JSON.stringify({ success: true, design: design.slides || [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[generate-slide-design] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
