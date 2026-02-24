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

    // If YouTube URL, resolve → download → upload to our bucket → signed URL for Shotstack
    if (isYouTubeUrl && videoUrl) {
      await supabase
        .from("clip_jobs")
        .update({
          progress: 5,
          progress_message: "Obtendo URL direta do YouTube...",
        })
        .eq("id", job.id);

      try {
        console.log("Resolving YouTube URL:", videoUrl);

        const { url: resolvedDirectUrl, diagnostics } = await resolveYouTubeToDirectUrl(videoUrl);

        if (!resolvedDirectUrl) {
          const diagnosticSummary = diagnostics.slice(0, 10).join(" | ");
          await supabase
            .from("clip_jobs")
            .update({
              status: "error",
              error_message: `Não foi possível obter URL direta do YouTube. Detalhes: ${diagnosticSummary || "sem detalhes"}. Tente upload manual do vídeo.`,
              progress_message: "Erro ao obter URL do YouTube",
            })
            .eq("id", job.id);
          return new Response(
            JSON.stringify({ error: "Erro ao baixar vídeo do YouTube" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Resolved YouTube URL, downloading to our storage...", resolvedDirectUrl.substring(0, 120));

        // Step 2: Download the video from the direct URL
        await supabase
          .from("clip_jobs")
          .update({
            progress: 6,
            progress_message: "Baixando vídeo do YouTube...",
          })
          .eq("id", job.id);

        const downloadController = new AbortController();
        const downloadTimeout = setTimeout(() => downloadController.abort(), 120000); // 2min timeout

        const videoResponse = await fetch(resolvedDirectUrl, {
          signal: downloadController.signal,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        clearTimeout(downloadTimeout);

        if (!videoResponse.ok) {
          throw new Error(`Falha ao baixar vídeo: HTTP ${videoResponse.status}`);
        }

        const videoBlob = await videoResponse.blob();
        const storagePath = `yt-downloads/${job.id}.mp4`;
        console.log(`Video downloaded: ${videoBlob.size} bytes, uploading to storage...`);

        // Step 3: Upload to our Supabase Storage bucket
        await supabase
          .from("clip_jobs")
          .update({
            progress: 7,
            progress_message: "Fazendo upload do vídeo para o servidor...",
          })
          .eq("id", job.id);

        const { error: uploadError } = await supabase.storage
          .from("videos-input")
          .upload(storagePath, videoBlob, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }

        // Step 4: Generate a signed URL valid for 1 hour
        const { data: signedData, error: signedError } = await supabase.storage
          .from("videos-input")
          .createSignedUrl(storagePath, 3600);

        if (signedError || !signedData?.signedUrl) {
          throw new Error(`Falha ao gerar URL assinada: ${signedError?.message || "sem URL"}`);
        }

        videoUrl = signedData.signedUrl;
        console.log("Video uploaded to our storage, signed URL ready for Shotstack");

        await supabase
          .from("clip_jobs")
          .update({
            progress: 8,
            progress_message: "Vídeo pronto, enviando para transcrição...",
          })
          .eq("id", job.id);
      } catch (ytError: any) {
        console.error("YouTube download/upload error:", ytError);
        await supabase
          .from("clip_jobs")
          .update({
            status: "error",
            error_message: `Erro ao processar YouTube: ${ytError?.message || "erro desconhecido"}`,
            progress_message: "Erro ao processar vídeo do YouTube",
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

async function resolveYouTubeToDirectUrl(youtubeUrl: string): Promise<{ url: string | null; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const apiBase = "https://refreshing-beauty-production-f560.up.railway.app";

  const normalizeYouTubeUrl = (raw: string) => {
    try {
      const u = new URL(raw);
      u.searchParams.delete("t");
      u.searchParams.delete("start");
      return u.toString();
    } catch {
      return raw;
    }
  };

  const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);

  const callEndpoint = async (endpoint: string, payload: Record<string, unknown>) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let data: any = null;
      try {
        data = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        data = null;
      }

      return { ok: response.ok, status: response.status, data, rawBody };
    } catch (error: any) {
      const msg = error?.name === "AbortError" ? "timeout (60s)" : (error?.message || "indisponível");
      return { ok: false, status: 0, data: null, rawBody: msg };
    } finally {
      clearTimeout(timeout);
    }
  };

  const getHost = (candidateUrl: string) => {
    try {
      return new URL(candidateUrl).hostname;
    } catch {
      return "invalid-url";
    }
  };

  const isDirectMediaCandidate = (candidateUrl: string) => {
    try {
      const parsed = new URL(candidateUrl);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("youtube.com") || host.includes("youtu.be")) return false;
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const checkUrlReachableFromEdge = async (candidateUrl: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(candidateUrl, {
        method: "GET",
        headers: { Range: "bytes=0-1" },
        signal: controller.signal,
      });

      const ok = response.status === 200 || response.status === 206;
      return { ok, status: response.status };
    } catch (error: any) {
      const msg = error?.name === "AbortError" ? "timeout (20s)" : (error?.message || "indisponível");
      return { ok: false, status: 0, message: msg };
    } finally {
      clearTimeout(timeout);
    }
  };

  const evaluateCandidate = async (candidateUrl: string, sourceLabel: string) => {
    if (!isDirectMediaCandidate(candidateUrl)) {
      diagnostics.push(`${sourceLabel}: URL não é mídia direta`);
      return null;
    }

    const reachability = await checkUrlReachableFromEdge(candidateUrl);
    if (!reachability.ok) {
      const host = getHost(candidateUrl);
      diagnostics.push(`${sourceLabel}: URL inacessível do edge (host=${host}, status=${reachability.status || reachability.message || "n/a"})`);
      return null;
    }

    diagnostics.push(`${sourceLabel}: ok (host=${getHost(candidateUrl)})`);
    return candidateUrl;
  };

  // 1) Preferred endpoint: /direct-url with format fallbacks
  const directFormats = ["best[ext=mp4]", "18", "22", "best"];
  for (const format of directFormats) {
    const directRes = await callEndpoint("/direct-url", { url: normalizedUrl, format });

    if (!directRes.ok) {
      diagnostics.push(`yt-dlp-api /direct-url (${format}): HTTP ${directRes.status} - ${(directRes.rawBody || "").substring(0, 120)}`);
      continue;
    }

    const directUrl = directRes.data?.url;
    if (typeof directUrl === "string" && directUrl.startsWith("http")) {
      const accepted = await evaluateCandidate(directUrl, `yt-dlp-api /direct-url (${format})`);
      if (accepted) return { url: accepted, diagnostics };
      continue;
    }

    diagnostics.push(`yt-dlp-api /direct-url (${format}): sem campo url`);
  }

  // 2) Fallback endpoint: /info (use main url + formats list)
  const infoRes = await callEndpoint("/info", { url: normalizedUrl });
  if (infoRes.ok && infoRes.data) {
    const candidates: string[] = [];

    if (typeof infoRes.data?.url === "string") {
      candidates.push(infoRes.data.url);
    }

    if (Array.isArray(infoRes.data?.formats)) {
      for (const f of infoRes.data.formats) {
        if (typeof f?.url === "string") candidates.push(f.url);
      }
    }

    const uniqueCandidates = [...new Set(candidates)].slice(0, 20);
    for (const candidate of uniqueCandidates) {
      const accepted = await evaluateCandidate(candidate, "yt-dlp-api /info");
      if (accepted) return { url: accepted, diagnostics };
    }

    diagnostics.push("yt-dlp-api /info: nenhum candidato utilizável");
  } else {
    diagnostics.push(`yt-dlp-api /info: HTTP ${infoRes.status} - ${(infoRes.rawBody || "").substring(0, 120)}`);
  }

  // 3) Last fallback: /download (legacy)
  const downloadRes = await callEndpoint("/download", { url: normalizedUrl });
  if (downloadRes.ok && typeof downloadRes.data?.download_url === "string") {
    const accepted = await evaluateCandidate(downloadRes.data.download_url, "yt-dlp-api /download");
    if (accepted) return { url: accepted, diagnostics };
    diagnostics.push("yt-dlp-api /download: URL recebida, mas não acessível");
  } else {
    diagnostics.push(`yt-dlp-api /download: HTTP ${downloadRes.status} - ${(downloadRes.rawBody || "").substring(0, 120)}`);
  }

  return { url: null, diagnostics };
}

