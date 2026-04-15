import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const {
      project_id,
      prompt,
      slides_count,
      company_id,
      copywriter_instructions,
    } = await req.json();

    if (!project_id || !prompt?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "project_id e prompt são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const n = Math.max(1, Math.min(12, slides_count ?? 6));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Gera os slides com IA
    const userPrompt = `Crie o conteúdo para um carrossel de Instagram com exatamente ${n} slides sobre o seguinte tema:

${prompt}

Regras:
- O slide 1 deve ser um gancho forte e curto (headline impactante, sem subtítulo ou subtítulo mínimo)
- Os slides 2 a ${n - 1} devem desenvolver o conteúdo com dicas, pontos ou insights
- O slide ${n} deve ser o CTA (chamada para ação)
- Headline: máximo 8 palavras, impactante, pode usar **palavra** para destacar termos em negrito
- Subtitle: máximo 20 palavras, complementa o headline, pode ser null para slides de gancho/CTA
- Idioma: português do Brasil

Responda APENAS com JSON válido neste formato exato (array de ${n} objetos):
[
  {"slide_number": 1, "headline": "...", "subtitle": null},
  {"slide_number": 2, "headline": "...", "subtitle": "..."},
  ...
]`;

    const baseSystemPrompt =
      "Você é um especialista em criar conteúdo viral para Instagram. Cria carrosseis com ganchos fortes, conteúdo de valor e CTAs persuasivos. Retorna apenas JSON válido.";

    const systemPrompt = copywriter_instructions?.trim()
      ? `${baseSystemPrompt}\n\nINSTRUÇÕES DE COPYWRITER DO CLIENTE:\n${copywriter_instructions}\n\nSiga RIGOROSAMENTE essas instruções de tom, linguagem e regras de copy ao gerar os textos.`
      : baseSystemPrompt;

    const aiResult = await callAI({
      functionName: "regenerate-carousel-slides",
      companyId: company_id,
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.75,
      responseFormat: { type: "json_object" },
    });

    // Parseia resposta
    let slides: Array<{
      slide_number: number;
      headline: string;
      subtitle: string | null;
    }> = [];

    try {
      const parsed = JSON.parse(aiResult.content);
      // A IA pode retornar { slides: [...] } ou diretamente [...]
      slides = Array.isArray(parsed) ? parsed : (parsed.slides ?? []);
    } catch {
      const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) slides = JSON.parse(jsonMatch[0]);
    }

    if (!slides.length) {
      throw new Error("IA não retornou slides válidos");
    }

    // Busca slides existentes para preservar configurações visuais
    const { data: existingSlides, error: fetchError } = await supabase
      .from("carousel_studio_slides")
      .select("id, slide_number")
      .eq("project_id", project_id)
      .order("slide_number");

    if (fetchError) throw fetchError;

    // Atualiza cada slide existente com o novo conteúdo
    const updates = slides.map((s) => {
      const existing = existingSlides?.find(
        (e) => e.slide_number === s.slide_number,
      );
      if (existing) {
        return supabase
          .from("carousel_studio_slides")
          .update({ headline: s.headline, subtitle: s.subtitle ?? null })
          .eq("id", existing.id);
      }
      return null;
    });

    await Promise.all(updates.filter(Boolean));

    // Se slides_count mudou, adiciona ou remove slides
    const existingCount = existingSlides?.length ?? 0;
    if (n > existingCount) {
      // Adiciona slides faltando
      const newRows = Array.from({ length: n - existingCount }, (_, i) => ({
        project_id,
        slide_number: existingCount + i + 1,
        headline: slides[existingCount + i]?.headline ?? null,
        subtitle: slides[existingCount + i]?.subtitle ?? null,
      }));
      if (newRows.length > 0) {
        await supabase.from("carousel_studio_slides").insert(newRows);
      }
    } else if (n < existingCount) {
      // Remove slides excedentes
      const toDelete =
        existingSlides?.filter((s) => s.slide_number > n).map((s) => s.id) ??
        [];
      if (toDelete.length > 0) {
        await supabase
          .from("carousel_studio_slides")
          .delete()
          .in("id", toDelete);
      }
    }

    // Retorna slides atualizados
    const { data: updatedSlides, error: finalError } = await supabase
      .from("carousel_studio_slides")
      .select("*")
      .eq("project_id", project_id)
      .order("slide_number");

    if (finalError) throw finalError;

    return new Response(
      JSON.stringify({ success: true, slides: updatedSlides }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[regenerate-carousel-slides] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
