import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const jobId = url.searchParams.get("jobId");
    const clipIndex = url.searchParams.get("clipIndex");
    const callbackType = url.searchParams.get("type");

    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY")!;

    if (secret !== shotstackApiKey) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log(
      `Shotstack webhook received - type: ${callbackType}, jobId: ${jobId}`,
      JSON.stringify(body).substring(0, 500),
    );

    if (callbackType === "ingest") {
      await handleIngestCallback(
        supabase,
        jobId,
        body,
        shotstackApiKey,
        supabaseUrl,
      );
    } else if (callbackType === "edit") {
      await handleEditCallback(supabase, jobId, body, clipIndex, url);
    } else {
      console.error("Unknown callback type:", callbackType);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("shotstack-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function handleIngestCallback(
  supabase: unknown,
  jobId: string,
  body: unknown,
  shotstackApiKey: string,
  supabaseUrl: string,
) {
  const status = body.status;

  if (status === "failed") {
    const errorDetail = body.error || "Erro desconhecido";
    console.error(`Ingest failed for job ${jobId}: ${errorDetail}`);
    await supabase
      .from("clip_jobs")
      .update({
        status: "error",
        error_message: `Falha na transcrição: ${errorDetail}. O Shotstack não suporta URLs do YouTube diretamente — use um link direto para o arquivo de vídeo (.mp4) ou faça upload do vídeo.`,
        progress: 0,
        progress_message: "Erro na transcrição do vídeo",
      })
      .eq("id", jobId);
    return;
  }

  if (status !== "ready") {
    console.log(`Ingest status not ready yet: ${status}`);
    return;
  }

  await supabase
    .from("clip_jobs")
    .update({
      progress: 30,
      progress_message: "Transcrição recebida, analisando momentos virais...",
    })
    .eq("id", jobId);

  const sourceId = body.id;
  let transcriptionUrl = "";
  let sourceVideoUrl = "";

  if (body.outputs?.transcription?.url) {
    transcriptionUrl = body.outputs.transcription.url;
  }

  if (body.attributes?.url) {
    sourceVideoUrl = body.attributes.url;
  } else if (body.url) {
    sourceVideoUrl = body.url;
  }

  if (!transcriptionUrl) {
    const sourceResponse = await fetch(
      `https://api.shotstack.io/ingest/v1/sources/${sourceId}`,
      {
        headers: { "x-api-key": shotstackApiKey },
      },
    );
    const sourceData = await sourceResponse.json();
    console.log(
      "Source data from API:",
      JSON.stringify(sourceData).substring(0, 500),
    );
    transcriptionUrl =
      sourceData.data?.attributes?.outputs?.transcription?.url || "";
    sourceVideoUrl = sourceVideoUrl || sourceData.data?.attributes?.url || "";
  }

  if (!transcriptionUrl) {
    await supabase
      .from("clip_jobs")
      .update({
        status: "error",
        error_message:
          "URL da transcrição não encontrada no callback do Shotstack",
        progress: 0,
        progress_message: "Erro: transcrição não disponível",
      })
      .eq("id", jobId);
    return;
  }

  const vttResponse = await fetch(transcriptionUrl);
  const vttContent = await vttResponse.text();
  console.log("VTT content length:", vttContent.length);

  // Get job details including new config fields
  const { data: job } = await supabase
    .from("clip_jobs")
    .select(
      "max_clips, format, max_duration_seconds, time_start_seconds, time_end_seconds, context_description, user_id, company_id, client_id",
    )
    .eq("id", jobId)
    .single();

  const maxClips = job?.max_clips || 30;
  const format = job?.format || "9:16";
  const maxDurationSeconds = job?.max_duration_seconds || 60;
  const timeStartSeconds = job?.time_start_seconds;
  const timeEndSeconds = job?.time_end_seconds;
  const contextDescription = job?.context_description;
  const companyId = job?.company_id;

  const viralMoments = await analyzeTranscriptionWithAI(
    vttContent,
    maxClips,
    maxDurationSeconds,
    timeStartSeconds,
    timeEndSeconds,
    contextDescription,
    companyId,
  );

  if (!viralMoments || viralMoments.length === 0) {
    await supabase
      .from("clip_jobs")
      .update({
        status: "error",
        error_message: "Nenhum momento viral identificado na transcrição",
        progress: 0,
        progress_message: "Nenhum momento viral encontrado",
      })
      .eq("id", jobId);
    return;
  }

  console.log(`Found ${viralMoments.length} viral moments`);

  await supabase
    .from("clip_jobs")
    .update({
      progress: 50,
      progress_message: `${viralMoments.length} momentos virais encontrados, renderizando clipes...`,
      total_expected_clips: viralMoments.length,
      shotstack_source_id: sourceId,
    })
    .eq("id", jobId);

  const webhookBaseUrl = `${supabaseUrl}/functions/v1/shotstack-webhook?secret=${encodeURIComponent(shotstackApiKey)}&jobId=${jobId}&type=edit`;

  const renderIds: string[] = [];

  for (let i = 0; i < viralMoments.length; i++) {
    const moment = viralMoments[i];
    const clipLength = moment.end_seconds - moment.start_seconds;

    const renderPayload = {
      timeline: {
        tracks: [
          {
            clips: [
              {
                asset: {
                  type: "video",
                  src: sourceVideoUrl,
                  trim: moment.start_seconds,
                },
                start: 0,
                length: clipLength,
              },
            ],
          },
        ],
      },
      output: {
        format: "mp4",
        resolution: "hd",
        aspectRatio: format,
      },
      callback: `${webhookBaseUrl}&clipIndex=${i}&title=${encodeURIComponent(moment.title)}&clipType=${encodeURIComponent(moment.clip_type || "")}&score=${moment.virality_score || 0}&reason=${encodeURIComponent(moment.reason || "")}`,
    };

    const renderResponse = await fetch(
      "https://api.shotstack.io/edit/v1/render",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": shotstackApiKey,
        },
        body: JSON.stringify(renderPayload),
      },
    );

    const renderData = await renderResponse.json();
    console.log(
      `Render ${i} response:`,
      JSON.stringify(renderData).substring(0, 300),
    );

    if (renderData.response?.id) {
      renderIds.push(renderData.response.id);
    } else if (renderData.data?.id) {
      renderIds.push(renderData.data.id);
    }
  }

  await supabase
    .from("clip_jobs")
    .update({
      shotstack_render_ids: renderIds,
    })
    .eq("id", jobId);
}

async function handleEditCallback(
  supabase: unknown,
  jobId: string,
  body: unknown,
  clipIndex: string | null,
  reqUrl: URL,
) {
  const status = body.status;

  if (status === "failed") {
    console.error(`Clip render failed for job ${jobId}, index ${clipIndex}`);
    return;
  }

  if (status !== "done") {
    console.log(`Edit status not done yet: ${status}`);
    return;
  }

  const clipUrl = body.url || body.data?.attributes?.url || "";
  const title =
    reqUrl.searchParams.get("title") ||
    `Clip ${(parseInt(clipIndex || "0") || 0) + 1}`;
  const clipType = reqUrl.searchParams.get("clipType") || "viral";
  const score = parseInt(reqUrl.searchParams.get("score") || "0") || 0;
  const reason = reqUrl.searchParams.get("reason") || "";

  const { data: job } = await supabase
    .from("clip_jobs")
    .select("user_id, company_id, client_id, total_expected_clips, format")
    .eq("id", jobId)
    .single();

  if (!job) {
    console.error("Job not found:", jobId);
    return;
  }

  const { error: clipError } = await supabase.from("clips").insert({
    job_id: jobId,
    user_id: job.user_id,
    company_id: job.company_id || null,
    client_id: job.client_id || null,
    clip_url: clipUrl,
    title: title,
    clip_type: clipType,
    virality_score: score,
    reason: reason,
    format: job.format || "9:16",
    status: "ready",
  });

  if (clipError) {
    console.error("Error inserting clip:", clipError);
  }

  const { count } = await supabase
    .from("clips")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  const totalExpected = job.total_expected_clips || 1;

  if ((count || 0) >= totalExpected) {
    await supabase
      .from("clip_jobs")
      .update({
        status: "done",
        progress: 100,
        progress_message: `${count} clipes gerados com sucesso!`,
      })
      .eq("id", jobId);
  } else {
    const progressPct = 50 + Math.round(((count || 0) / totalExpected) * 50);
    await supabase
      .from("clip_jobs")
      .update({
        progress: progressPct,
        progress_message: `Renderizando clipes... (${count || 0}/${totalExpected})`,
      })
      .eq("id", jobId);
  }
}

async function analyzeTranscriptionWithAI(
  vttContent: string,
  maxClips: number,
  maxDurationSeconds: number,
  timeStartSeconds: number | null,
  timeEndSeconds: number | null,
  contextDescription: string | null,
  companyId: string | null,
): Promise<
  Array<{
    title: string;
    clip_type: string;
    virality_score: number;
    reason: string;
    start_seconds: number;
    end_seconds: number;
  }>
> {
  let timeConstraint = "";
  if (timeStartSeconds != null || timeEndSeconds != null) {
    const start = timeStartSeconds != null ? `${timeStartSeconds}s` : "início";
    const end = timeEndSeconds != null ? `${timeEndSeconds}s` : "fim";
    timeConstraint = `\n- IMPORTANTE: Considere APENAS trechos entre ${start} e ${end} do vídeo.`;
  }

  let contextConstraint = "";
  if (contextDescription) {
    contextConstraint = `\n- CONTEXTO DESEJADO PELO USUÁRIO: "${contextDescription}". Priorize trechos que se encaixem nesse critério.`;
  }

  const userPrompt = `Você é um especialista em conteúdo viral para redes sociais. Analise a transcrição VTT abaixo e identifique os melhores momentos para clipes virais.

INSTRUÇÕES:
- Gere QUANTOS clipes forem necessários com base na qualidade do conteúdo (mínimo 1, máximo ${maxClips})
- NÃO force gerar ${maxClips} clipes se o conteúdo não justificar. Prefira qualidade a quantidade.
- Cada clipe deve ter entre 15 e ${maxDurationSeconds} segundos${timeConstraint}${contextConstraint}

Para cada momento, retorne:
- title: título curto e chamativo para o clipe
- clip_type: tipo do clipe (hook, storytelling, insight, humor, polêmica, tutorial, motivacional)
- virality_score: nota de 0 a 100 do potencial viral
- reason: justificativa estratégica de por que esse trecho é viral
- start_seconds: segundo de início do trecho
- end_seconds: segundo de fim do trecho

REGRAS:
- Priorize trechos com hooks fortes, frases de impacto, histórias envolventes ou insights valiosos
- Evite trechos com pausas longas ou conteúdo genérico
- Os trechos NÃO devem se sobrepor
- Cada clipe deve ter no MÁXIMO ${maxDurationSeconds} segundos de duração
- Só inclua clipes com virality_score >= 40

Retorne APENAS um JSON array, sem markdown, sem explicação adicional.

TRANSCRIÇÃO VTT:
${vttContent}`;

  const aiResult = await callAI({
    functionName: "shotstack-webhook",
    companyId: companyId || undefined,
    systemPrompt:
      "Você é um especialista em conteúdo viral. Responda APENAS com JSON válido, sem markdown.",
    userPrompt,
    maxTokens: 8000,
    temperature: 0.7,
  });

  const content = aiResult.content;

  try {
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse AI response:", content);
    return [];
  }
}
