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

    // If YouTube URL, download via Railway proxy → upload to our bucket → signed URL for Shotstack
    if (isYouTubeUrl && videoUrl) {
      await supabase
        .from("clip_jobs")
        .update({
          progress: 5,
          progress_message: "Baixando vídeo do YouTube via proxy...",
        })
        .eq("id", job.id);

      try {
        const apiBase = "https://refreshing-beauty-production-f560.up.railway.app";
        const normalizedUrl = normalizeYouTubeUrl(videoUrl);
        console.log("Downloading YouTube video via proxy:", normalizedUrl);

        // Try to stream the video through Railway (which has the correct IP for googlevideo)
        let videoBlob: Blob | null = null;
        let downloadMethod = "";

        // Method 1: Use /download endpoint as a proxy stream
        const proxyFormats = ["best[ext=mp4]", "18", "22", "best"];
        for (const fmt of proxyFormats) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 150000); // 2.5min

            const response = await fetch(`${apiBase}/download`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: normalizedUrl, format: fmt }),
              signal: controller.signal,
            });
            clearTimeout(timeout);

            const ct = (response.headers.get("content-type") || "").toLowerCase();
            console.log(`/download (${fmt}): status=${response.status}, content-type=${ct}, content-length=${response.headers.get("content-length")}`);

            // If the server returns actual video bytes (not JSON)
            if (response.ok && (ct.includes("video/") || ct.includes("octet-stream"))) {
              videoBlob = await response.blob();
              downloadMethod = `/download stream (${fmt})`;
              console.log(`Got video blob via stream: ${videoBlob.size} bytes`);
              break;
            }

            // If it returns JSON with a download_url, we need to try differently
            if (response.ok && ct.includes("application/json")) {
              const jsonData = await response.json();
              // If there's a file_path or download_url served from the Railway server itself
              if (jsonData.file_url && !jsonData.file_url.includes("googlevideo.com")) {
                console.log("Got non-googlevideo file_url from /download:", jsonData.file_url.substring(0, 100));
                const fileResp = await fetch(jsonData.file_url);
                if (fileResp.ok) {
                  videoBlob = await fileResp.blob();
                  downloadMethod = `/download file_url (${fmt})`;
                  console.log(`Got video blob via file_url: ${videoBlob.size} bytes`);
                  break;
                }
              }
              // If download_url is googlevideo, skip (IP-restricted)
              const dlUrl = jsonData.download_url || jsonData.url;
              if (dlUrl && !dlUrl.includes("googlevideo.com") && !dlUrl.includes("ytimg.com")) {
                console.log("Trying non-google download_url:", dlUrl.substring(0, 100));
                const dlResp = await fetch(dlUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
                if (dlResp.ok) {
                  const dlCt = (dlResp.headers.get("content-type") || "").toLowerCase();
                  if (dlCt.includes("video/") || dlCt.includes("octet-stream")) {
                    videoBlob = await dlResp.blob();
                    downloadMethod = `/download url (${fmt})`;
                    console.log(`Got video blob via download_url: ${videoBlob.size} bytes`);
                    break;
                  }
                }
              }
              console.log(`/download (${fmt}): JSON response, no usable stream - ${JSON.stringify(jsonData).substring(0, 200)}`);
            }
          } catch (e: any) {
            console.log(`/download (${fmt}) error: ${e?.message || e}`);
          }
        }

        // Method 2: Try /direct-url and download (for non-googlevideo URLs)
        if (!videoBlob || videoBlob.size < 500_000) {
          console.log("Stream method failed, trying /direct-url for non-googlevideo URLs...");
          const directFormats = ["best[ext=mp4]", "18", "22", "best"];
          for (const fmt of directFormats) {
            try {
              const res = await fetch(`${apiBase}/direct-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: normalizedUrl, format: fmt }),
              });
              if (!res.ok) continue;
              const data = await res.json();
              const directUrl = data?.url;
              if (!directUrl || typeof directUrl !== "string") continue;
              
              // Skip googlevideo URLs (IP-restricted)
              if (directUrl.includes("googlevideo.com")) {
                console.log(`/direct-url (${fmt}): googlevideo URL, skipping (IP-restricted)`);
                continue;
              }

              console.log(`/direct-url (${fmt}): trying non-google URL: ${directUrl.substring(0, 100)}`);
              const dlResp = await fetch(directUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
              if (dlResp.ok) {
                const blob = await dlResp.blob();
                if (blob.size >= 500_000) {
                  videoBlob = blob;
                  downloadMethod = `/direct-url (${fmt})`;
                  console.log(`Got video via direct-url: ${blob.size} bytes`);
                  break;
                }
              }
            } catch (e: any) {
              console.log(`/direct-url (${fmt}) error: ${e?.message}`);
            }
          }
        }

        if (!videoBlob || videoBlob.size < 500_000) {
          throw new Error(
            `Não foi possível baixar o vídeo do YouTube. URLs do googlevideo são restritas por IP e não podem ser acessadas de nossos servidores. ` +
            `Faça upload manual do vídeo (.mp4). Método tentado: ${downloadMethod || "nenhum funcionou"}, tamanho: ${videoBlob ? (videoBlob.size / 1024).toFixed(0) + "KB" : "0"}`
          );
        }

        console.log(`YouTube video downloaded successfully via ${downloadMethod}: ${videoBlob.size} bytes`);

        // Upload to our bucket
        await supabase
          .from("clip_jobs")
          .update({
            progress: 7,
            progress_message: "Fazendo upload do vídeo para o servidor...",
          })
          .eq("id", job.id);

        const storagePath = `yt-downloads/${job.id}.mp4`;
        const { error: uploadError } = await supabase.storage
          .from("videos-input")
          .upload(storagePath, videoBlob, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }

        // Generate signed URL
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

function normalizeYouTubeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.delete("t");
    u.searchParams.delete("start");
    return u.toString();
  } catch {
    return raw;
  }
}


