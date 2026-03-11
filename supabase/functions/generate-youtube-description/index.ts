import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId } = await req.json();

    if (!scriptId) {
      throw new Error("scriptId is required");
    }

    // Fetch script
    const { data: script, error: scriptError } = await supabase
      .from("youtube_scripts")
      .select("*")
      .eq("id", scriptId)
      .single();

    if (scriptError || !script) {
      throw new Error("Script not found");
    }

    console.log("Generating SEO description for:", script.title);

    const userPrompt = `Gere uma descrição otimizada para SEO do YouTube baseada no roteiro abaixo.

TÍTULO DO VÍDEO:
${script.title}

ROTEIRO DO VÍDEO (resumo):
${(script.script_content || "").substring(0, 3000)}

REGRAS DE SEO PARA YOUTUBE:
1. Primeiras 2-3 linhas são CRUCIAIS — aparecem antes do "mostrar mais". Devem conter a palavra-chave principal e um gancho forte.
2. Inclua 3-5 palavras-chave relevantes naturalmente ao longo do texto.
3. Use timestamps (00:00 - Introdução, etc.) baseados no conteúdo do roteiro.
4. Inclua um CTA (Call to Action) para inscrição e engajamento.
5. Adicione 3-5 hashtags relevantes no final.
6. Tamanho ideal: 200-500 palavras.
7. Inclua links genéricos placeholders para redes sociais.
8. Use emojis estrategicamente (sem exagerar).

ESTRUTURA DA DESCRIÇÃO:
- Gancho + resumo (2-3 linhas antes do "mostrar mais")
- Descrição expandida do conteúdo
- Timestamps (📌 Timestamps / Capítulos)
- CTA para engajamento
- Links de redes sociais (placeholders)
- Hashtags

Retorne em formato JSON:
{
  "description": "A descrição completa aqui com quebras de linha usando \\n",
  "keywords": ["palavra-chave1", "palavra-chave2"],
  "seo_score_tips": ["Dica 1 para melhorar SEO", "Dica 2"]
}`;

    const aiResult = await callAI({
      functionName: "generate-youtube-description",
      systemPrompt:
        "Você é especialista em SEO para YouTube. Gere descrições que maximizam descoberta e engajamento. Retorne apenas JSON válido.",
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    const result = JSON.parse(aiResult.content);

    // Save description to script
    if (result.description) {
      await supabase
        .from("youtube_scripts")
        .update({ video_description: result.description } as unknown)
        .eq("id", scriptId);
    }

    console.log("Description generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        description: result.description,
        keywords: result.keywords || [],
        seo_tips: result.seo_score_tips || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-youtube-description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
