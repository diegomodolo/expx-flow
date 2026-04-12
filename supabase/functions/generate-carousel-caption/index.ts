import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, slides, company_id } = await req.json();

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "slides é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const slidesText = slides
      .map(
        (s: { headline?: string; subtitle?: string }, i: number) =>
          `Slide ${i + 1}: ${s.headline ?? ""} — ${s.subtitle ?? ""}`,
      )
      .join("\n");

    const userPrompt = `Com base nos slides abaixo, crie:
1. Uma legenda envolvente para Instagram (máx 200 palavras), com gancho forte e CTA no final
2. 5-8 hashtags relevantes em português

Slides:
${slidesText}

Responda APENAS com JSON válido no formato:
{"caption": "...", "hashtags": ["#tag1", "#tag2"]}`;

    console.log(
      `[generate-carousel-caption] Gerando legenda para ${slides.length} slide(s), project_id=${project_id}`,
    );

    const aiResult = await callAI({
      functionName: "generate-carousel-caption",
      companyId: company_id,
      systemPrompt:
        "Você é um copywriter especialista em Instagram. Crie legendas envolventes com gancho forte, valor real e CTA persuasivo. Retorne apenas JSON válido.",
      userPrompt,
      maxTokens: 600,
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    let parsed: { caption?: string; hashtags?: string[] } = {};
    try {
      parsed = JSON.parse(aiResult.content);
    } catch {
      // Fallback: tentar extrair JSON com regex caso venha com texto extra
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    }

    console.log(`[generate-carousel-caption] Legenda gerada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        caption: parsed.caption ?? "",
        hashtags: parsed.hashtags ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-carousel-caption] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
