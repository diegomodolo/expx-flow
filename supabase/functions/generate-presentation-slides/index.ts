import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { scriptId, scriptContent, title, numberOfSlides = 10 } = await req.json();

    if (!scriptId || !scriptContent) {
      return new Response(
        JSON.stringify({ error: "scriptId and scriptContent are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-presentation-slides] Generating slides for script: ${scriptId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get script info to verify ownership
    const { data: scriptData, error: scriptError } = await supabase
      .from("youtube_scripts")
      .select("company_id, client_id")
      .eq("id", scriptId)
      .single();

    if (scriptError || !scriptData) {
      throw new Error("Script not found");
    }

    const systemPrompt = `Você é um especialista em criar apresentações de slides para vídeos do YouTube.

Sua tarefa é analisar o roteiro fornecido e criar uma estrutura de apresentação profissional e visualmente impactante.

Para cada slide, você DEVE definir:
1. **title**: Título curto e impactante (máximo 6 palavras)
2. **content**: Conteúdo principal em formato de bullets (3-5 pontos concisos)
3. **visual_suggestion**: Descrição detalhada para gerar a imagem do slide, incluindo:
   - Elementos visuais principais
   - Cores e estilo sugeridos
   - Ícones ou gráficos relevantes
   - Atmosfera/mood

IMPORTANTE:
- Crie exatamente ${numberOfSlides} slides
- O primeiro slide deve ser uma capa impactante
- O último slide deve ser um CTA (call-to-action)
- Mantenha consistência visual entre os slides
- Use linguagem direta e persuasiva
- Cada visual_suggestion deve ser detalhada o suficiente para gerar uma imagem única

Retorne APENAS um JSON válido no formato:
{
  "slides": [
    {
      "title": "Título do Slide",
      "content": "• Ponto 1\\n• Ponto 2\\n• Ponto 3",
      "visual_suggestion": "Descrição visual detalhada para geração de imagem"
    }
  ]
}`;

    const userPrompt = `Título do vídeo: ${title || "Sem título definido"}

Roteiro completo:
${scriptContent}

Crie a estrutura de ${numberOfSlides} slides para este roteiro.`;

    console.log(`[generate-presentation-slides] Calling AI to generate slide structure...`);

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-presentation-slides] AI error:`, errorText);
      throw new Error("Failed to generate slides structure");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content from AI");
    }

    console.log(`[generate-presentation-slides] AI response received, parsing...`);

    // Parse JSON from AI response
    let slidesData;
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      slidesData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[generate-presentation-slides] Parse error:", parseError);
      console.error("[generate-presentation-slides] Raw content:", aiContent);
      throw new Error("Failed to parse AI response");
    }

    if (!slidesData.slides || !Array.isArray(slidesData.slides)) {
      throw new Error("Invalid slides data structure");
    }

    console.log(`[generate-presentation-slides] Parsed ${slidesData.slides.length} slides`);

    // Delete existing slides for this script
    await supabase
      .from("youtube_script_slides")
      .delete()
      .eq("script_id", scriptId);

    // Insert new slides
    const slidesToInsert = slidesData.slides.map((slide: any, index: number) => ({
      script_id: scriptId,
      slide_order: index + 1,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || "",
      visual_suggestion: slide.visual_suggestion || "",
      status: "draft",
    }));

    const { data: insertedSlides, error: insertError } = await supabase
      .from("youtube_script_slides")
      .insert(slidesToInsert)
      .select();

    if (insertError) {
      console.error("[generate-presentation-slides] Insert error:", insertError);
      throw new Error("Failed to save slides");
    }

    console.log(`[generate-presentation-slides] Successfully saved ${insertedSlides?.length} slides`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        slides: insertedSlides,
        count: insertedSlides?.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[generate-presentation-slides] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
