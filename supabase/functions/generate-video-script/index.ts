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

async function generateScript(
  topic: string,
  clientContext: string,
  referenceVideos: unknown[],
  durationTarget: number,
  companyId: string,
  sourceContent?: string,
): Promise<string> {
  const durationMinutes = Math.round(durationTarget / 60);

  const sourceContentBlock = sourceContent
    ? `\nCONTEÚDO BASE FORNECIDO PELO USUÁRIO (usar como referência principal para criar o roteiro):\n---\n${sourceContent}\n---\nIMPORTANTE: O roteiro DEVE ser baseado neste conteúdo. Extraia as ideias principais, reorganize de forma envolvente para vídeo e adapte a linguagem para YouTube.\n`
    : "";

  const userPrompt = `Crie um roteiro completo para vídeo do YouTube sobre "${topic}".
${sourceContentBlock}
CONTEXTO DO CLIENTE/CANAL:
${clientContext}

REFERÊNCIAS DE VÍDEOS DE SUCESSO (analisar estilo e abordagem):
${referenceVideos.map((v) => `- "${v.title}" (${v.view_count?.toLocaleString()} views, ${v.engagement_rate?.toFixed(2)}% engajamento)`).join("\n")}

DURAÇÃO ALVO: ${durationMinutes} minutos

ESTRUTURA OBRIGATÓRIA DO ROTEIRO:

## 🎬 HOOK (0-15 segundos)
[Gancho inicial impactante para prender atenção imediatamente]
- Frase de abertura poderosa
- Pergunta provocativa ou dado surpreendente
- Promessa do que o vídeo entregará

## 📌 INTRODUÇÃO (15-45 segundos)
[Apresentação do tema e promessa de valor]
- O que será abordado
- Por que isso é importante
- O que o espectador vai aprender/ganhar

## 📖 DESENVOLVIMENTO

### Ponto 1 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do primeiro ponto principal]

### Ponto 2 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do segundo ponto principal]

### Ponto 3 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do terceiro ponto principal]

(Adicione mais pontos conforme necessário para a duração)

## 🎯 CTA (últimos 30 segundos)
[Call to action claro e convincente]
- Pedido de like e inscrição
- Comentário sugerido
- Próximo vídeo recomendado

## 📝 NOTAS DE PRODUÇÃO
- **B-roll sugerido:** [Lista de imagens/vídeos de apoio]
- **Gráficos/Texto na tela:** [Momentos para inserir elementos visuais]
- **Tom de voz:** [Descrição do estilo de apresentação]
- **Música:** [Sugestão de estilo/mood da trilha]

---

Escreva o roteiro completo, detalhado e pronto para gravação. Use linguagem natural e envolvente.`;

  const aiResult = await callAI({
    functionName: "generate-video-script",
    companyId,
    systemPrompt:
      "Você é um roteirista profissional especializado em vídeos para YouTube. Crie roteiros envolventes, bem estruturados e otimizados para retenção de audiência. Use técnicas de storytelling e gatilhos de engajamento.",
    userPrompt,
    maxTokens: 4000,
    temperature: 0.7,
  });

  return aiResult.content;
}

async function generateTitles(
  topic: string,
  referenceVideos: unknown[],
  companyId: string,
): Promise<string[]> {
  const userPrompt = `Gere 5 títulos altamente engajantes para um vídeo do YouTube sobre: "${topic}"

REFERÊNCIAS DE TÍTULOS DE SUCESSO:
${referenceVideos
  .slice(0, 5)
  .map((v) => `- "${v.title}"`)
  .join("\n")}

Use gatilhos mentais como:
- Curiosidade (números, segredos, revelações)
- Urgência (agora, hoje, antes que)
- Benefício claro (como, por que, resultado)
- Provocação (pare de, nunca mais, erro)
- Exclusividade (poucos sabem, revelado)

IMPORTANTE:
- Títulos com 40-60 caracteres performam melhor
- Use CAPS para palavras-chave importantes
- Inclua números quando apropriado
- Evite clickbait sem entrega

Retorne apenas os 5 títulos, um por linha, sem numeração.`;

  const aiResult = await callAI({
    functionName: "generate-video-script",
    companyId,
    systemPrompt:
      "Você é especialista em títulos virais para YouTube. Crie títulos que maximizam CTR e engajamento.",
    userPrompt,
    maxTokens: 500,
    temperature: 0.8,
  });

  const titles = aiResult.content
    .split("\n")
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0);

  return titles;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      topic,
      labId,
      companyId,
      suggestionId,
      clientContext,
      referenceVideoIds,
      durationTarget = 600, // 10 minutes default
      sourceVideoTitle,
      sourceContent,
    } = await req.json();

    console.log(
      "Generating script for topic:",
      topic,
      "labId:",
      labId,
      "companyId:",
      companyId,
    );

    if (!topic || !labId || !companyId) {
      console.error("Missing required fields:", {
        topic: !!topic,
        labId: !!labId,
        companyId: !!companyId,
      });
      throw new Error(
        `Topic, Lab ID and Company ID are required. Got: topic=${topic}, labId=${labId}, companyId=${companyId}`,
      );
    }

    // Fetch reference videos if provided
    let referenceVideos: unknown[] = [];
    if (referenceVideoIds && referenceVideoIds.length > 0) {
      const { data: videos } = await supabase
        .from("youtube_video_analyses")
        .select("*")
        .in("id", referenceVideoIds);

      if (videos) {
        referenceVideos = videos;
      }
    } else {
      // Get top performing videos from this lab's monitored channels
      const { data: videos } = await supabase
        .from("youtube_video_analyses")
        .select("*")
        .eq("lab_id", labId)
        .order("engagement_rate", { ascending: false })
        .limit(5);

      if (videos) {
        referenceVideos = videos;
      }
    }

    console.log("Using", referenceVideos.length, "reference videos");

    // Generate script (first LLM call)
    const scriptContent = await generateScript(
      topic,
      clientContext || "Canal de conteúdo educativo e informativo",
      referenceVideos,
      durationTarget,
      companyId,
      sourceContent,
    );

    console.log("Script generated, length:", scriptContent.length);

    // Generate title suggestions (second LLM call)
    const suggestedTitles = await generateTitles(
      topic,
      referenceVideos,
      companyId,
    );
    console.log("Generated", suggestedTitles.length, "title suggestions");

    // Get reference thumbnails
    const referenceThumbnails = referenceVideos
      .filter((v) => v.thumbnail_url)
      .slice(0, 6)
      .map((v) => v.thumbnail_url);

    // Save script to database
    const { data: script, error: saveError } = await supabase
      .from("youtube_scripts")
      .insert({
        lab_id: labId,
        company_id: companyId,
        suggestion_id: suggestionId || null,
        source_video_id: sourceVideoTitle || null,
        title: suggestedTitles[0] || topic,
        script_content: scriptContent,
        suggested_titles: suggestedTitles,
        reference_thumbnails: referenceThumbnails,
        video_duration_target: durationTarget,
        status: "draft",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving script:", saveError);
      throw new Error("Failed to save script");
    }

    console.log("Script saved with ID:", script.id);

    // Update suggestion status if provided
    if (suggestionId) {
      await supabase
        .from("youtube_content_suggestions")
        .update({ status: "scripted" })
        .eq("id", suggestionId);
    }

    // Add initial assistant message to chat
    await supabase.from("youtube_script_messages").insert({
      script_id: script.id,
      role: "assistant",
      content: `Roteiro criado com sucesso! 🎬\n\nEste roteiro foi baseado na análise de ${referenceVideos.length} vídeos de alto engajamento. Você pode me pedir para:\n\n- Tornar a abertura mais impactante\n- Adicionar mais exemplos práticos\n- Ajustar o tom (mais formal/informal)\n- Expandir alguma seção específica\n- Reduzir a duração do roteiro\n\nComo posso ajudar a melhorar o roteiro?`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        script: {
          id: script.id,
          title: script.title,
          content: scriptContent,
          suggestedTitles,
          referenceThumbnails,
          durationTarget,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-video-script:", error);
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
