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
        },
      );
    }

    // Check if it's a YouTube URL - will be resolved later
    let isYouTubeUrl = false;
    if (inputUrl) {
      const urlLower = inputUrl.toLowerCase();
      isYouTubeUrl =
        urlLower.includes("youtube.com") || urlLower.includes("youtu.be");
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
          },
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
        const apiBase =
          "https://refreshing-beauty-production-f560.up.railway.app";
        const normalizedUrl = normalizeYouTubeUrl(videoUrl);
        console.log(
          "Downloading YouTube video via /stream proxy:",
          normalizedUrl,
        );

        let videoBlob: Blob | null = null;

        // Method 1: GET /stream - proxies the full video through Railway
        try {
          const encodedUrl = encodeURIComponent(normalizedUrl);
          const streamUrl = `${apiBase}/stream?url=${encodedUrl}`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 180000); // 3min timeout

          const streamResponse = await fetch(streamUrl, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (streamResponse.ok) {
            videoBlob = await streamResponse.blob();
            console.log(`/stream success: ${videoBlob.size} bytes`);
          } else {
            const errText = await streamResponse.text().catch(() => "");
            console.log(
              `/stream failed (${streamResponse.status}): ${errText.substring(0, 300)}`,
            );
          }
        } catch (streamErr: unknown) {
          console.log(`/stream error: ${streamErr?.message || streamErr}`);
        }

        // Method 2: POST /info to get direct URL, then download
        if (!videoBlob || videoBlob.size < 500_000) {
          console.log("Trying /info fallback...");
          try {
            const infoResp = await fetch(`${apiBase}/info`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: normalizedUrl }),
            });
            if (infoResp.ok) {
              const infoData = await infoResp.json();
              const directUrl = infoData?.url;
              if (directUrl && typeof directUrl === "string") {
                console.log(`/info got URL: ${directUrl.substring(0, 100)}`);
                const dlResp = await fetch(directUrl, {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  },
                });
                if (dlResp.ok) {
                  const blob = await dlResp.blob();
                  if (blob.size >= 500_000) {
                    videoBlob = blob;
                    console.log(`/info download success: ${blob.size} bytes`);
                  } else {
                    console.log(`/info download too small: ${blob.size} bytes`);
                  }
                }
              }
            } else {
              const errText = await infoResp.text().catch(() => "");
              console.log(`/info failed: ${errText.substring(0, 200)}`);
            }
          } catch (infoErr: unknown) {
            console.log(`/info error: ${infoErr?.message}`);
          }
        }

        // Method 3: POST /direct-url
        if (!videoBlob || videoBlob.size < 500_000) {
          console.log("Trying /direct-url fallback...");
          try {
            const duResp = await fetch(`${apiBase}/direct-url`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: normalizedUrl }),
            });
            if (duResp.ok) {
              const duData = await duResp.json();
              const duUrl = duData?.url;
              if (duUrl && typeof duUrl === "string") {
                console.log(`/direct-url got URL: ${duUrl.substring(0, 100)}`);
                const dlResp = await fetch(duUrl, {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  },
                });
                if (dlResp.ok) {
                  const blob = await dlResp.blob();
                  if (blob.size >= 500_000) {
                    videoBlob = blob;
                    console.log(
                      `/direct-url download success: ${blob.size} bytes`,
                    );
                  }
                }
              }
            }
          } catch (duErr: unknown) {
            console.log(`/direct-url error: ${duErr?.message}`);
          }
        }

        if (!videoBlob || videoBlob.size < 500_000) {
          throw new Error(
            `Não foi possível baixar o vídeo do YouTube. O servidor de download não conseguiu processar este vídeo. Tente outro vídeo ou faça upload manual do .mp4.`,
          );
        }

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
          throw new Error(
            `Falha ao gerar URL assinada: ${signedError?.message || "sem URL"}`,
          );
        }

        videoUrl = signedData.signedUrl;
        console.log(
          "Video uploaded to our storage, signed URL ready for Shotstack",
        );

        await supabase
          .from("clip_jobs")
          .update({
            progress: 8,
            progress_message: "Vídeo pronto, enviando para transcrição...",
          })
          .eq("id", job.id);
      } catch (ytError: unknown) {
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
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
        },
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

    console.log(
      "Sending to Shotstack Ingest API:",
      JSON.stringify({ url: videoUrl?.substring(0, 100), callback: "..." }),
    );

    const ingestResponse = await fetch(
      "https://api.shotstack.io/ingest/v1/sources",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": shotstackApiKey,
        },
        body: JSON.stringify(ingestPayload),
      },
    );

    const ingestData = await ingestResponse.json();
    console.log(
      "Shotstack Ingest response:",
      JSON.stringify(ingestData).substring(0, 500),
    );

    if (!ingestResponse.ok) {
      const errorMsg =
        ingestData.message ||
        ingestData.error ||
        "Erro ao enviar para Shotstack";
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
      },
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
