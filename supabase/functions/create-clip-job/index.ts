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
        const resolvedDirectUrl = await resolveYouTubeToDirectUrl(videoUrl, apifyToken);

        if (!resolvedDirectUrl) {
          await supabase
            .from("clip_jobs")
            .update({
              status: "error",
              error_message:
                "Não foi possível obter URL direta do YouTube. Tente um link direto .mp4 ou faça upload manual do vídeo.",
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
      return candidate;
    }
  }

  const itemStr = JSON.stringify(item);
  const mp4Match = itemStr.match(/"(https?:\/\/[^\"]+\.mp4[^\"]*)"/i);
  if (mp4Match) return mp4Match[1];

  const videoLikeMatch = itemStr.match(/"(https?:\/\/[^\"]+(?:video|download|stream|media)[^\"]*)"/i);
  if (videoLikeMatch) return videoLikeMatch[1];

  return null;
}

function extractCobaltUrl(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  const directCandidates = [
    payload.url,
    payload?.data?.url,
    payload?.result?.url,
    payload?.output?.url,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
  }

  if (Array.isArray(payload.picker)) {
    for (const item of payload.picker) {
      if (typeof item?.url === "string" && item.url.startsWith("http")) {
        return item.url;
      }
    }
  }

  return null;
}

async function tryResolveWithCobalt(youtubeUrl: string, endpoint: string): Promise<string | null> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        videoQuality: "720",
        vCodec: "h264",
      }),
    });

    const rawBody = await response.text();
    let payload: any = null;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      console.error(`Cobalt resolver failed [${response.status}] (${endpoint}):`, rawBody.substring(0, 500));
      return null;
    }

    const resolvedUrl = extractCobaltUrl(payload);
    if (!resolvedUrl) {
      console.error(`Cobalt returned no downloadable URL (${endpoint}):`, rawBody.substring(0, 500));
      return null;
    }

    return resolvedUrl;
  } catch (error) {
    console.error(`Cobalt resolver error (${endpoint}):`, error);
    return null;
  }
}

async function tryResolveWithApify(youtubeUrl: string, apifyToken: string): Promise<string | null> {
  const cookiesText = Deno.env.get("YOUTUBE_COOKIES_TEXT") ?? undefined;

  const actors: Array<{ id: string; input: Record<string, unknown> }> = [
    {
      id: "scrapearchitect~youtube-video-downloader",
      input: {
        urls: [youtubeUrl],
        quality: "720p",
        type: "video",
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
        return resolvedUrl;
      }

      console.error(`Apify actor returned no downloadable URL (${actor.id}):`, rawBody.substring(0, 500));
    } catch (error) {
      console.error(`Apify actor resolver error (${actor.id}):`, error);
    }
  }

  return null;
}

async function resolveYouTubeToDirectUrl(youtubeUrl: string, apifyToken?: string): Promise<string | null> {
  const cobaltEndpoints = [
    "https://api.cobalt.tools/api/json",
    "https://co.wuk.sh/api/json",
  ];

  for (const endpoint of cobaltEndpoints) {
    const directUrl = await tryResolveWithCobalt(youtubeUrl, endpoint);
    if (directUrl) return directUrl;
  }

  if (apifyToken) {
    const directUrl = await tryResolveWithApify(youtubeUrl, apifyToken);
    if (directUrl) return directUrl;
  }

  return null;
}
