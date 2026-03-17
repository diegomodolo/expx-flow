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

    const userPrompt = `Você é um diretor criativo de apresentações premium. Analise o conteúdo abaixo e crie um design ÚNICO e VARIADO para cada slide. Cada slide deve parecer diferente — nunca repita a mesma estrutura visual.

TÍTULO DO VÍDEO: ${script.title}
TOTAL DE SLIDES: ${slides.length}

SLIDES:
${slidesContext}

LAYOUTS DISPONÍVEIS — 15 opções com estruturas visuais DISTINTAS:

LAYOUTS DE IMPACTO (poucos elementos, máximo destaque):
- "cover": Capa. Título enorme + subtítulo + marca. OBRIGATÓRIO no slide 1.
- "quote": Frase centralizada gigante estilo citação. Para frases marcantes, insight ou provocação.
- "full-gradient": Título bold centralizado sobre gradiente. Para transições entre seções ou chamadas.
- "big-number": Número/estatística GIGANTE à esquerda + contexto à direita. Para dados, percentuais, métricas. Campos extras: "bigNumber" (ex: "73%") e "bigNumberLabel" (ex: "dos usuários").

LAYOUTS ESTRUTURADOS (informação organizada):
- "feature-list": Itens numerados com badges coloridos. Para passos, etapas, dicas, benefícios.
- "icon-grid": Grid 2x2 ou 3x2 de cards com badges. Para múltiplos pontos curtos, características, ferramentas.
- "timeline": Linha do tempo horizontal com etapas conectadas. Para processos, cronologias, evolução.
- "card-stack": Cards empilhados com offset progressivo. Para listas com hierarquia visual.

LAYOUTS DIVIDIDOS (dois blocos distintos):
- "split-bullets": Título grande à esquerda, bullets à direita com divisor. Para explicações.
- "split-accent": Conteúdo à esquerda + bloco colorido grande à direita. Para conceito + destaque.
- "split-inverted": Bloco colorido à esquerda com título + lista à direita. Inverso do split-accent.
- "comparison": Dois blocos lado a lado com divisor VS. Para antes/depois, prós/contras. Campo extra: "columnsData" array de {heading, text}.
- "columns": Título no topo + 2-3 cards lado a lado. Para comparações, categorias. Campo extra: "columnsData" array de {heading, text}.

ENCERRAMENTO:
- "outline": Sumário numerado dos tópicos com sidebar colorida. Para recapitulação.
- "closing": Slide final com CTA + botão de inscrição. OBRIGATÓRIO no último slide.

REGRAS CRIATIVAS — LEIA COM ATENÇÃO:
1. VARIEDADE É A PRIORIDADE #1. Nunca use o mesmo layout em 2 slides. Use no mínimo 6 layouts diferentes em uma apresentação de 10 slides.
2. Analise o CONTEÚDO de cada slide individualmente. Escolha o layout que MELHOR COMUNICA aquela informação específica.
3. Se o conteúdo menciona número, porcentagem ou estatística → considere "big-number".
4. Se o conteúdo tem uma lista de itens curtos → considere "icon-grid" ou "card-stack".
5. Se o conteúdo descreve um processo ou sequência → considere "timeline".
6. Se o conteúdo compara dois cenários → considere "comparison".
7. Se o conteúdo tem uma frase de impacto ou insight → considere "quote" ou "full-gradient".
8. Se o conteúdo tem conceito + explicação → considere "split-accent" ou "split-bullets".
9. Títulos devem ser CURTOS e PROVOCANTES (máx 5-6 palavras). Reescreva completamente se necessário.
10. Bullets devem ser CONCISOS (máx 12 palavras cada). Máximo 4-5 bullets.
11. O campo "highlight" deve conter a palavra-chave mais importante do slide.
12. Pense como um designer: crie RITMO VISUAL. Alterne entre slides densos e slides respirados.
13. Primeiro slide DEVE ser "cover", último DEVE ser "closing".

Retorne JSON com este formato:
{
  "slides": [
    {
      "slideId": "uuid-do-slide",
      "layout": "cover",
      "title": "Título Reescrito Curto",
      "subtitle": "Subtítulo opcional",
      "bullets": ["Bullet 1", "Bullet 2"],
      "highlight": "palavra destaque",
      "accentText": "texto para bloco accent (split-accent)",
      "bigNumber": "73%",
      "bigNumberLabel": "dos usuários",
      "columnsData": [{"heading": "Coluna 1", "text": "conteúdo"}, {"heading": "Coluna 2", "text": "conteúdo"}]
    }
  ]
}

IMPORTANTE: Inclua APENAS os campos relevantes para cada layout. Nem todo slide precisa de todos os campos.`;

    const aiResult = await callAI({
      functionName: "generate-slide-design",
      companyId,
      systemPrompt:
        "Você é um diretor criativo de apresentações premium. Sua especialidade é criar apresentações visualmente diversas onde cada slide tem uma estrutura visual diferente. Retorne apenas JSON válido, sem markdown.",
      userPrompt,
      maxTokens: 4000,
      temperature: 0.8,
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
