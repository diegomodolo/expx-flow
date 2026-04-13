import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SlideSummary {
  slide_number: number;
  headline: string | null;
  subtitle: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const {
      company_id,
      carousel_prompt,
      image_style,
      all_slides,
      current_slide_number,
      image_type, // "background" | "content_below" | "content_above"
    }: {
      company_id?: string;
      carousel_prompt: string;
      image_style?: string;
      all_slides: SlideSummary[];
      current_slide_number: number;
      image_type: "background" | "content_below" | "content_above";
    } = await req.json();

    if (!Array.isArray(all_slides) || all_slides.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "all_slides é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const current = all_slides.find(
      (s) => s.slide_number === current_slide_number,
    );
    if (!current) {
      return new Response(
        JSON.stringify({ success: false, error: "Slide atual não encontrado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const carouselOutline = all_slides
      .map(
        (s) =>
          `Slide ${s.slide_number}: ${s.headline ?? "(sem título)"}${
            s.subtitle ? ` — ${s.subtitle}` : ""
          }`,
      )
      .join("\n");

    const imageTypeDesc = {
      background:
        "imagem de FUNDO do slide inteiro (4:5). O texto do slide será sobreposto a ela, então deve ser limpa/cinematográfica, sem competir com o texto.",
      content_below:
        "imagem ILUSTRATIVA colocada ABAIXO do texto do slide (16:9). Deve ilustrar visualmente o conceito específico do slide, como uma foto/ilustração editorial.",
      content_above:
        "imagem ILUSTRATIVA colocada ACIMA do texto do slide (16:9). Deve ser atraente, representando o tema do slide de forma clara.",
    }[image_type];

    const systemPrompt = `Você é um diretor de arte especializado em carrosséis do Instagram.
Sua tarefa é criar um prompt visual ESPECÍFICO e ÚNICO para a imagem de um slide, considerando o contexto completo do carrossel.
Responda APENAS com o prompt visual em português, sem explicações, sem markdown, sem aspas.
O prompt deve ter no máximo 400 caracteres, ser descritivo, visual e evitar clichês genéricos.`;

    const userPrompt = `Tema geral do carrossel: ${carousel_prompt}
${image_style ? `Estilo visual desejado: ${image_style}` : ""}

Estrutura completa do carrossel (para contexto):
${carouselOutline}

Slide específico para esta imagem:
- Número: ${current.slide_number}
- Título: ${current.headline ?? "(sem título)"}
- Subtítulo: ${current.subtitle ?? "(sem subtítulo)"}

Tipo de imagem: ${imageTypeDesc}

Gere o prompt visual ESPECÍFICO para este slide. A imagem deve:
1. Representar exatamente o conceito/ideia deste slide específico (não ser genérica nem repetir o tema do carrossel todo)
2. Ser visualmente distinta das imagens dos outros slides
3. Usar elementos concretos (objetos, cenas, pessoas, ambientes) que ilustrem o conteúdo
4. Seguir o estilo visual solicitado
5. NÃO incluir texto, letras, logos ou números na imagem

Retorne APENAS o prompt visual, direto, em português, sem introduções.`;

    const aiResult = await callAI({
      functionName: "generate-carousel-slide-image-prompt",
      companyId: company_id ?? undefined,
      systemPrompt,
      userPrompt,
      temperature: 0.85,
    });

    const visualPrompt = aiResult.content
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/^prompt:\s*/i, "")
      .slice(0, 600);

    return new Response(
      JSON.stringify({ success: true, prompt: visualPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-carousel-slide-image-prompt] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "Erro ao gerar prompt",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
