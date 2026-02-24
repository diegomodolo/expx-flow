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
    const authHeader = req.headers.get("Authorization")!;
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

    // If YouTube URL, resolve to direct URL via Apify
    if (isYouTubeUrl && videoUrl) {
      await supabase
        .from("clip_jobs")
        .update({
          progress: 5,
          progress_message: "Baixando vídeo do YouTube...",
        })
        .eq("id", job.id);

      const apifyToken = Deno.env.get("APIFY_API_TOKEN");
      if (!apifyToken) {
        await supabase
          .from("clip_jobs")
          .update({
            status: "error",
            error_message: "APIFY_API_TOKEN não configurada para download do YouTube",
          })
          .eq("id", job.id);
        return new Response(
          JSON.stringify({ error: "APIFY_API_TOKEN não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        console.log("Resolving YouTube URL via Apify:", videoUrl);

        // Use scrapearchitect/youtube-video-downloader which returns direct links
        const apifyResponse = await fetch(
          `https://api.apify.com/v2/acts/scrapearchitect~youtube-video-downloader/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urls: [videoUrl],
              quality: "720p",
              type: "video",
            }),
          }
        );

        if (!apifyResponse.ok) {
          const errorText = await apifyResponse.text();
          console.error("Apify actor failed:", errorText);
          
          // Fallback: try tazy/youtube-converter
          console.log("Trying fallback actor: tazy~youtube-converter");
          const fallbackResponse = await fetch(
            `https://api.apify.com/v2/acts/tazy~youtube-converter/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: videoUrl,
                format: "mp4",
                quality: "720",
              }),
            }
          );

          if (!fallbackResponse.ok) {
            const fallbackError = await fallbackResponse.text();
            console.error("Fallback actor also failed:", fallbackError);
            await supabase
              .from("clip_jobs")
              .update({
                status: "error",
                error_message: `Erro ao baixar vídeo do YouTube. Tente fazer upload do vídeo manualmente.`,
              })
              .eq("id", job.id);
            return new Response(
              JSON.stringify({ error: "Erro ao baixar vídeo do YouTube" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const fallbackItems = await fallbackResponse.json();
          console.log("Fallback Apify response:", JSON.stringify(fallbackItems).substring(0, 800));
          
          const fallbackUrl = extractDownloadUrl(fallbackItems);
          if (fallbackUrl) {
            videoUrl = fallbackUrl;
          } else {
            await supabase
              .from("clip_jobs")
              .update({
                status: "error",
                error_message: "Não foi possível obter URL direta do YouTube. Tente fazer upload do vídeo manualmente.",
              })
              .eq("id", job.id);
            return new Response(
              JSON.stringify({ error: "Não foi possível obter URL direta do YouTube" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const apifyItems = await apifyResponse.json();
          console.log("Apify response items:", JSON.stringify(apifyItems).substring(0, 800));

          const directUrl = extractDownloadUrl(apifyItems);

          if (!directUrl) {
            console.error("No download URL in Apify response");
            await supabase
              .from("clip_jobs")
              .update({
                status: "error",
                error_message: "Não foi possível obter URL direta do YouTube. Tente fazer upload do vídeo manualmente.",
              })
              .eq("id", job.id);
            return new Response(
              JSON.stringify({ error: "Não foi possível obter URL direta do YouTube" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          videoUrl = directUrl;
        }

        console.log("Resolved YouTube URL to direct URL:", directUrl.substring(0, 100));
        videoUrl = directUrl;

        await supabase
          .from("clip_jobs")
          .update({
            progress: 8,
            progress_message: "Vídeo do YouTube resolvido, enviando para transcrição...",
          })
          .eq("id", job.id);
      } catch (ytError) {
        console.error("YouTube download error:", ytError);
        await supabase
          .from("clip_jobs")
          .update({
            status: "error",
            error_message: `Erro ao processar YouTube: ${ytError.message || "erro desconhecido"}`,
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
  
  // Try common field names used by different YouTube downloader actors
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
    // Nested formats
    item?.video?.url,
    item?.video?.downloadUrl,
    item?.media?.url,
    item?.result?.url,
    item?.output?.url,
  ];
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
  }
  
  // Try to find any URL-like string in the first item
  const itemStr = JSON.stringify(item);
  const urlMatch = itemStr.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/);
  if (urlMatch) return urlMatch[1];
  
  // Try any URL that looks like a video
  const videoUrlMatch = itemStr.match(/"(https?:\/\/[^"]+(?:video|download|stream|media)[^"]*)"/);
  if (videoUrlMatch) return videoUrlMatch[1];
  
  return null;
}
