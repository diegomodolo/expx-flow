import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const {
      inputUrl,
      inputStoragePath,
      maxClips = 30,
      format = "9:16",
      maxDurationSeconds = 60,
      timeStartSeconds,
      timeEndSeconds,
      contextDescription,
      companyId,
      clientId,
    } = await req.json();

    if (!inputUrl && !inputStoragePath) {
      return new Response(
        JSON.stringify({ error: "inputUrl ou inputStoragePath é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if it's a YouTube URL - will be resolved later
    let isYouTubeUrl = false;
    if (inputUrl) {
      const urlLower = inputUrl.toLowerCase();
      isYouTubeUrl = urlLower.includes("youtube.com") || urlLower.includes("youtu.be");
    }

    // Create job with all config
    const { data: job, error: insertError } = await supabase
      .from("clip_jobs")
      .insert({
        user_id: user.id,
        company_id: companyId || null,
        client_id: clientId || null,
        input_url: inputUrl ?? null,
        input_storage_path: inputStoragePath ?? null,
        status: "pending",
        progress: 0,
        progress_message: "Job criado, enviando vídeo para transcrição...",
        max_clips: maxClips,
        format: format,
        max_duration_seconds: maxDurationSeconds,
        time_start_seconds: timeStartSeconds ?? null,
        time_end_seconds: timeEndSeconds ?? null,
        context_description: contextDescription ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine video URL
    let videoUrl = inputUrl;

    if (!videoUrl && inputStoragePath) {
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("clips-input")
          .createSignedUrl(inputStoragePath, 3600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Error generating signed URL:", signedUrlError);
        await supabase
          .from("clip_jobs")
          .update({
            status: "error",
            error_message: "Erro ao gerar URL do vídeo no storage",
          })
          .eq("id", job.id);
        return new Response(
          JSON.stringify({ error: "Erro ao gerar URL do vídeo" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      videoUrl = signedUrlData.signedUrl;
    }

    // If YouTube URL, resolve to a direct file URL before Shotstack ingest
    if (isYouTubeUrl && videoUrl) {
      await supabase
        .from("clip_jobs")
        .update({
          progress: 5,
          progress_message: "Preparando vídeo do YouTube...",
        })
        .eq("id", job.id);

      try {
        console.log("Resolving YouTube URL:", videoUrl);

        const apifyToken = Deno.env.get("APIFY_API_TOKEN") ?? undefined;
        const { url: resolvedDirectUrl, diagnostics } = await resolveYouTubeToDirectUrl(videoUrl, apifyToken);

        if (!resolvedDirectUrl) {
          const diagnosticSummary = diagnostics.slice(0, 6).join(" | ");

          await supabase
            .from("clip_jobs")
            .update({
              status: "error",
              error_message:
                `Não foi possível obter URL direta do YouTube. Detalhes: ${diagnosticSummary || "sem detalhes"}. Tente upload manual do vídeo.`,
            })
            .eq("id", job.id);

          return new Response(
            JSON.stringify({ error: "Erro ao baixar vídeo do YouTube" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        videoUrl = resolvedDirectUrl;
        console.log("Resolved YouTube URL to direct URL:", videoUrl.substring(0, 100));

        await supabase
          .from("clip_jobs")
          .update({
            progress: 8,
            progress_message: "Vídeo do YouTube resolvido, enviando para transcrição...",
          })
          .eq("id", job.id);
      } catch (ytError: any) {
        console.error("YouTube download error:", ytError);
        await supabase
          .from("clip_jobs")
          .update({
            status: "error",
            error_message: `Erro ao processar YouTube: ${ytError?.message || "erro desconhecido"}`,
          })
          .eq("id", job.id);
        return new Response(
          JSON.stringify({ error: "Erro ao processar vídeo do YouTube" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send to Shotstack Ingest API
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      await supabase
        .from("clip_jobs")
        .update({
          status: "error",
          error_message: "SHOTSTACK_API_KEY não configurada",
        })
        .eq("id", job.id);
      return new Response(
        JSON.stringify({ error: "Shotstack API key não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/shotstack-webhook?secret=${encodeURIComponent(shotstackApiKey)}&jobId=${job.id}&type=ingest`;

    const ingestPayload = {
      url: videoUrl,
      outputs: {
        transcription: {
          format: "vtt",
        },
      },
      callback: callbackUrl,
    };

    console.log("Sending to Shotstack Ingest API:", JSON.stringify({ url: videoUrl?.substring(0, 100), callback: "..." }));

    const ingestResponse = await fetch(
      "https://api.shotstack.io/ingest/v1/sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": shotstackApiKey,
        },
        body: JSON.stringify(ingestPayload),
      }
    );

    const ingestData = await ingestResponse.json();
    console.log("Shotstack Ingest response:", JSON.stringify(ingestData).substring(0, 500));

    if (!ingestResponse.ok) {
      const errorMsg = ingestData.message || ingestData.error || "Erro ao enviar para Shotstack";
      await supabase
        .from("clip_jobs")
        .update({
          status: "error",
          error_message: `Shotstack Ingest error: ${errorMsg}`,
        })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceId = ingestData.data?.id || ingestData.id || "";
    await supabase
      .from("clip_jobs")
      .update({
        status: "processing",
        progress: 10,
        progress_message: "Vídeo enviado, aguardando transcrição...",
        shotstack_source_id: sourceId,
      })
      .eq("id", job.id);

    return new Response(JSON.stringify({ jobId: job.id, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-clip-job error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

interface ResolveResult {
  url: string | null;
  diagnostics: string[];
}

const DEFAULT_INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://inv.tux.pizza",
];

function normalizeCandidateUrl(candidate: string, baseUrl?: string): string {
  const normalized = candidate.replace(/\\u0026/g, "&");

  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;

  if (baseUrl && normalized.startsWith("/")) {
    try {
      return new URL(normalized, baseUrl).toString();
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function getYouTubeVideoId(youtubeUrl: string): string | null {
  try {
    const parsed = new URL(youtubeUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host.endsWith("youtube.com")) {
      const queryVideoId = parsed.searchParams.get("v");
      if (queryVideoId) return queryVideoId;

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const markerIndex = pathParts.findIndex((part) =>
        ["shorts", "embed", "live"].includes(part)
      );

      if (markerIndex >= 0 && pathParts[markerIndex + 1]) {
        return pathParts[markerIndex + 1];
      }
    }
  } catch {
    // fallback para regex abaixo
  }

  const fallbackMatch = youtubeUrl.match(
    /(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return fallbackMatch?.[1] ?? null;
}

async function fetchInvidiousInstances(): Promise<string[]> {
  try {
    const response = await fetch("https://api.invidious.io/instances.json?sort_by=health");

    if (!response.ok) {
      console.error(`Invidious instance list failed [${response.status}]`);
      return [];
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];

    const instances = payload
      .map((entry: any) => {
        const host = entry?.[0];
        const metadata = entry?.[1];

        if (typeof host !== "string") return null;
        if (metadata?.type !== "https") return null;
        if (metadata?.api !== true) return null;

        return `https://${host}`;
      })
      .filter((value: string | null): value is string => Boolean(value));

    return instances.slice(0, 12);
  } catch (error) {
    console.error("Invidious instance discovery error:", error);
    return [];
  }
}

function extractInvidiousDownloadUrl(payload: any): string | null {
  const streamCollections = [
    ...(Array.isArray(payload?.formatStreams) ? payload.formatStreams : []),
    ...(Array.isArray(payload?.adaptiveFormats) ? payload.adaptiveFormats : []),
    ...(Array.isArray(payload?.videoStreams) ? payload.videoStreams : []),
  ];

  const streamCandidates = streamCollections
    .map((stream: any) => ({
      url: stream?.url ?? stream?.downloadUrl ?? stream?.streamUrl ?? null,
      mime: String(stream?.type ?? stream?.mimeType ?? ""),
      quality: String(stream?.qualityLabel ?? stream?.quality ?? ""),
    }))
    .filter(
      (stream: any) => typeof stream.url === "string" && stream.url.startsWith("http")
    );

  const mp4Candidates = streamCandidates.filter((stream: any) => /mp4/i.test(stream.mime));

  const preferredCandidate =
    mp4Candidates.find((stream: any) => /720|480|360/.test(stream.quality)) ??
    mp4Candidates[0] ??
    streamCandidates[0];

  if (preferredCandidate?.url) {
    return normalizeCandidateUrl(preferredCandidate.url);
  }

  const directCandidates = [
    payload?.hlsUrl,
    payload?.dashUrl,
    payload?.formatStreams?.[0]?.url,
    payload?.adaptiveFormats?.[0]?.url,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return normalizeCandidateUrl(candidate);
    }
  }

  return null;
}

async function tryResolveWithInvidious(youtubeUrl: string): Promise<ResolveResult> {
  const diagnostics: string[] = [];
  const videoId = getYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    diagnostics.push("invidious: URL inválida");
    return { url: null, diagnostics };
  }

  const discoveredInstances = await fetchInvidiousInstances();
  const instances = Array.from(
    new Set([...DEFAULT_INVIDIOUS_INSTANCES, ...discoveredInstances])
  ).slice(0, 10);

  for (const instance of instances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const rawBody = await response.text();
      const host = instance.replace("https://", "");

      if (!response.ok) {
        diagnostics.push(`invidious ${host}: HTTP ${response.status}`);
        continue;
      }

      let payload: any = null;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        diagnostics.push(`invidious ${host}: JSON inválido`);
        continue;
      }

      const resolvedUrl = extractInvidiousDownloadUrl(payload);
      if (resolvedUrl) {
        diagnostics.push(`invidious ${host}: ok`);
        return { url: resolvedUrl, diagnostics };
      }

      diagnostics.push(`invidious ${host}: sem stream`);
    } catch (error) {
      console.error(`Invidious resolver error (${instance}):`, error);
      diagnostics.push(`invidious ${instance.replace("https://", "")}: indisponível`);
    }
  }

  return { url: null, diagnostics };
}

// Helper to extract download URL from various Apify actor response formats
function extractDownloadUrl(items: any[]): string | null {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const item = items[0];

  const candidates = [
    item?.downloadUrl,
    item?.download_url,
    item?.videoUrl,
    item?.video_url,
    item?.url,
    item?.directUrl,
    item?.direct_url,
    item?.streamUrl,
    item?.stream_url,
    item?.fileUrl,
    item?.file_url,
    item?.mp4Url,
    item?.link,
    item?.video?.url,
    item?.video?.downloadUrl,
    item?.media?.url,
    item?.result?.url,
    item?.output?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return normalizeCandidateUrl(candidate);
    }
  }

  const itemStr = JSON.stringify(item);
  const mp4Match = itemStr.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/i);
  if (mp4Match) return normalizeCandidateUrl(mp4Match[1]);

  const videoLikeMatch = itemStr.match(
    /"(https?:\/\/[^"]+(?:video|download|stream|media)[^"]*)"/i
  );
  if (videoLikeMatch) return normalizeCandidateUrl(videoLikeMatch[1]);

  return null;
}

async function tryResolveWithApify(
  youtubeUrl: string,
  apifyToken: string
): Promise<ResolveResult> {
  const diagnostics: string[] = [];
  const cookiesText = Deno.env.get("YOUTUBE_COOKIES_TEXT") ?? undefined;

  const actors: Array<{ id: string; input: Record<string, unknown> }> = [
    {
      id: "scrapearchitect~youtube-video-downloader",
      input: {
        urls: [youtubeUrl],
        quality: "720p",
        type: "video",
        ...(cookiesText ? { cookiesText } : {}),
      },
    },
    {
      id: "tazy~youtube-converter",
      input: {
        url: youtubeUrl,
        format: "mp4",
        quality: "720",
        ...(cookiesText ? { cookiesText } : {}),
      },
    },
  ];

  for (const actor of actors) {
    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actor.id}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actor.input),
        }
      );

      const rawBody = await response.text();
      if (!response.ok) {
        diagnostics.push(`apify ${actor.id}: HTTP ${response.status}`);
        console.error(`Apify actor failed (${actor.id}) [${response.status}]:`, rawBody.substring(0, 500));
        continue;
      }

      let items: any[] = [];
      try {
        items = JSON.parse(rawBody);
      } catch {
        items = [];
      }

      const resolvedUrl = extractDownloadUrl(items);
      if (resolvedUrl) {
        diagnostics.push(`apify ${actor.id}: ok`);
        return { url: resolvedUrl, diagnostics };
      }

      diagnostics.push(`apify ${actor.id}: sem url`);
      console.error(`Apify actor returned no downloadable URL (${actor.id}):`, rawBody.substring(0, 500));
    } catch (error) {
      diagnostics.push(`apify ${actor.id}: indisponível`);
      console.error(`Apify actor resolver error (${actor.id}):`, error);
    }
  }

  return { url: null, diagnostics };
}

async function tryResolveWithPiped(youtubeUrl: string): Promise<ResolveResult> {
  const diagnostics: string[] = [];
  const videoId = getYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    diagnostics.push("piped: URL inválida");
    return { url: null, diagnostics };
  }

  const pipedInstances = [
    "https://api.piped.yt",
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.in.projectsegfau.lt",
    "https://pipedapi.leptons.xyz",
    "https://pipedapi.r4fo.com",
  ];

  const isRetryableStatus = (status: number) =>
    [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(status);

  for (const instance of pipedInstances) {
    const host = instance.replace("https://", "");
    const endpoints = [`${instance}/streams/${videoId}`, `${instance}/api/v1/videos/${videoId}`];

    for (const endpoint of endpoints) {
      let lastStatus: number | null = null;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        try {
          const response = await fetch(endpoint, {
            headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
            signal: controller.signal,
          });

          const rawBody = await response.text();
          lastStatus = response.status;

          if (!response.ok) {
            if (attempt < 2 && isRetryableStatus(response.status)) {
              await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
              continue;
            }

            break;
          }

          let data: any = null;
          try {
            data = rawBody ? JSON.parse(rawBody) : null;
          } catch {
            lastError = "json";
            break;
          }

          const resolvedUrl =
            extractInvidiousDownloadUrl(data) ??
            (typeof data?.hls === "string" ? data.hls : null);

          if (resolvedUrl) {
            diagnostics.push(`piped ${host}: ok`);
            return { url: normalizeCandidateUrl(resolvedUrl, instance), diagnostics };
          }

          lastError = "sem stream";
          break;
        } catch (error: any) {
          lastError = error?.name === "AbortError" ? "timeout" : "indisponível";
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
            continue;
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      const endpointLabel = endpoint.includes("/api/v1/videos/") ? "videos" : "streams";

      if (lastStatus) {
        diagnostics.push(`piped ${host} (${endpointLabel}): HTTP ${lastStatus}`);
      } else if (lastError) {
        diagnostics.push(`piped ${host} (${endpointLabel}): ${lastError}`);
      }
    }
  }

  return { url: null, diagnostics };
}

async function tryResolveWithCobalt(youtubeUrl: string): Promise<ResolveResult> {
  const diagnostics: string[] = [];

  const cobaltInstances = [
    "https://cobalt-backend.canine.tools",
    "https://cobalt-api.meowing.de",
    "https://capi.3kh0.net",
    "https://api.cobalt.tools",
  ];

  const payloadVariants = [
    {
      url: youtubeUrl,
      vCodec: "h264",
      vQuality: "720",
      isAudioOnly: false,
      disableMetadata: true,
      filenamePattern: "basic",
    },
    {
      url: youtubeUrl,
      videoQuality: "720",
      filenameStyle: "basic",
    },
    { url: youtubeUrl },
  ];

  const isRetryableStatus = (status: number) =>
    [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(status);

  for (const baseInstance of cobaltInstances) {
    const instance = baseInstance.replace(/\/+$/, "");
    const host = instance.replace("https://", "");
    const endpoints = [instance, `${instance}/api/json`];

    for (const endpoint of endpoints) {
      const endpointLabel = endpoint.endsWith("/api/json") ? "api/json" : "root";

      for (const payload of payloadVariants) {
        let lastStatus: number | null = null;
        let lastError: string | null = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0",
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            const rawBody = await response.text();
            lastStatus = response.status;

            let data: any = null;
            try {
              data = rawBody ? JSON.parse(rawBody) : null;
            } catch {
              data = null;
            }

            if (!response.ok) {
              const errorCode = data?.error?.code || data?.error || data?.message;
              if (errorCode) lastError = String(errorCode);

              if (attempt < 2 && isRetryableStatus(response.status)) {
                await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
                continue;
              }

              break;
            }

            if (data?.url && typeof data.url === "string" && data.url.startsWith("http")) {
              diagnostics.push(`cobalt ${host} (${endpointLabel}): ok (${data.status || "stream"})`);
              return { url: normalizeCandidateUrl(data.url, instance), diagnostics };
            }

            if (data?.status === "picker" && Array.isArray(data.picker) && data.picker.length > 0) {
              const videoItem = data.picker.find((p: any) => p.type === "video" && p.url) || data.picker[0];
              if (videoItem?.url) {
                diagnostics.push(`cobalt ${host} (${endpointLabel}): ok (picker)`);
                return { url: normalizeCandidateUrl(videoItem.url, instance), diagnostics };
              }
            }

            lastError = `sem url (${data?.status || "unknown"})`;
            break;
          } catch (error: any) {
            lastError = error?.name === "AbortError" ? "timeout" : "indisponível";
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
              continue;
            }
          } finally {
            clearTimeout(timeout);
          }
        }

        if (lastStatus) {
          diagnostics.push(
            `cobalt ${host} (${endpointLabel}): HTTP ${lastStatus}${lastError ? ` (${lastError})` : ""}`
          );
        } else if (lastError) {
          diagnostics.push(`cobalt ${host} (${endpointLabel}): ${lastError}`);
        }
      }
    }
  }

  return { url: null, diagnostics };
}

async function resolveYouTubeToDirectUrl(
  youtubeUrl: string,
  apifyToken?: string
): Promise<ResolveResult> {
  const diagnostics: string[] = [];

  // 1. Cobalt (instâncias com YouTube habilitado)
  console.log("Trying Cobalt resolver...");
  const cobaltResult = await tryResolveWithCobalt(youtubeUrl);
  diagnostics.push(...cobaltResult.diagnostics);
  if (cobaltResult.url) {
    return { url: cobaltResult.url, diagnostics: Array.from(new Set(diagnostics)).slice(0, 12) };
  }

  // 2. Piped
  console.log("Trying Piped resolver...");
  const pipedResult = await tryResolveWithPiped(youtubeUrl);
  diagnostics.push(...pipedResult.diagnostics);
  if (pipedResult.url) {
    return { url: pipedResult.url, diagnostics: Array.from(new Set(diagnostics)).slice(0, 12) };
  }

  // 3. Invidious
  console.log("Trying Invidious resolver...");
  const invidiousResult = await tryResolveWithInvidious(youtubeUrl);
  diagnostics.push(...invidiousResult.diagnostics);
  if (invidiousResult.url) {
    return { url: invidiousResult.url, diagnostics: Array.from(new Set(diagnostics)).slice(0, 12) };
  }

  // 4. Apify (último recurso)
  if (apifyToken) {
    console.log("Trying Apify resolver...");
    const apifyResult = await tryResolveWithApify(youtubeUrl, apifyToken);
    diagnostics.push(...apifyResult.diagnostics);
    if (apifyResult.url) {
      return { url: apifyResult.url, diagnostics: Array.from(new Set(diagnostics)).slice(0, 12) };
    }
  } else {
    diagnostics.push("apify: token ausente");
  }

  return { url: null, diagnostics: Array.from(new Set(diagnostics)).slice(0, 12) };
}

