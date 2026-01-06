import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATION = "us-central1";
const VEO_MODEL = "veo-2.0-generate-001";
const SCENE_DURATION = 6; // 5-8 seconds per scene, using 6 as middle ground
const MAX_SCENES = 5;

// Helper para criar JWT assinado com RS256
async function createSignedJWT(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const claimB64 = btoa(JSON.stringify(claim))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const signatureInput = `${headerB64}.${claimB64}`;

  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signatureB64}`;
}

async function getGCPAccessToken(serviceAccount: any): Promise<string> {
  const signedJwt = await createSignedJWT(serviceAccount);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Parse script to extract scenes
function parseScriptToScenes(script: string, headline: string, subheadline: string): { sceneNumber: number; prompt: string }[] {
  const scenes: { sceneNumber: number; prompt: string }[] = [];
  
  // Try to parse structured script format: CENA 1 (Xs): [ação] - "fala"
  const sceneRegex = /CENA\s*(\d+)[^:]*:\s*([^\n]+)/gi;
  let match;
  
  while ((match = sceneRegex.exec(script)) !== null && scenes.length < MAX_SCENES) {
    const sceneNumber = parseInt(match[1]);
    const sceneContent = match[2].trim();
    
    // Create video prompt from scene content - NO TEXT, pure visual
    const prompt = `Create a professional vertical video scene for social media. 
Scene description: ${sceneContent}
Context: ${headline}. ${subheadline}
Style: Modern, dynamic, engaging, cinematic lighting, smooth camera movement.
CRITICAL: Generate ONLY visual content. NO TEXT, NO TITLES, NO CAPTIONS, NO WORDS, NO OVERLAYS of any kind. Pure visual scene only.`;
    
    scenes.push({ sceneNumber, prompt });
  }
  
  // If no structured scenes found, create scenes from paragraphs or sentences
  if (scenes.length === 0) {
    const paragraphs = script.split(/\n+/).filter(p => p.trim().length > 10);
    const scenesToCreate = Math.min(paragraphs.length, MAX_SCENES);
    
    for (let i = 0; i < scenesToCreate; i++) {
      const prompt = `Create a professional vertical video scene for social media.
Scene ${i + 1} description: ${paragraphs[i].trim()}
Context: ${headline}. ${subheadline}
Style: Modern, dynamic, engaging, cinematic lighting, smooth camera movement.
CRITICAL: Generate ONLY visual content. NO TEXT, NO TITLES, NO CAPTIONS, NO WORDS, NO OVERLAYS of any kind. Pure visual scene only.`;
      
      scenes.push({ sceneNumber: i + 1, prompt });
    }
  }
  
  // Ensure we have at least 1 scene
  if (scenes.length === 0) {
    const prompt = `Create a professional vertical video for social media.
Topic: ${headline}. ${subheadline}
Script summary: ${script.substring(0, 200)}
Style: Modern, dynamic, engaging, cinematic lighting, smooth camera movement.
CRITICAL: Generate ONLY visual content. NO TEXT, NO TITLES, NO CAPTIONS, NO WORDS, NO OVERLAYS of any kind. Pure visual scene only.`;
    
    scenes.push({ sceneNumber: 1, prompt });
  }
  
  return scenes;
}

// Start video generation for a single scene
async function startSceneGeneration(
  accessToken: string,
  projectId: string,
  prompt: string,
): Promise<string> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${VEO_MODEL}:predictLongRunning`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio: "9:16",
      durationSeconds: SCENE_DURATION,
      sampleCount: 1,
      negativePrompt: "text, titles, captions, subtitles, overlays, words, letters, typography, watermarks, logos, brand logos, written content, signs with text, any written words, lettering, headlines, slogans",
    },
  };

  console.log("Starting scene generation:", { prompt: prompt.substring(0, 100) + "..." });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI error:", errorText);
    throw new Error(`Vertex AI error: ${errorText}`);
  }

  const data = await response.json();
  return data.name; // operation name for polling
}

// Check operation status
async function checkOperationStatus(
  accessToken: string,
  operationName: string,
  projectId: string,
): Promise<{
  done: boolean;
  videoBase64?: string;
  videoGcsUri?: string;
  videoUri?: string;
  mimeType?: string;
  error?: string;
}> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${VEO_MODEL}:fetchPredictOperation`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operationName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Operation check error: ${errorText}`);
  }

  const data = await response.json();

  if (!data.done && !data.response && !data.error) {
    return { done: false };
  }

  if (data.error) {
    return { done: true, error: data.error.message || JSON.stringify(data.error) };
  }

  const resp = data.response ?? data;

  // 1) Try to extract inline base64 (older/alternate response shapes)
  let videoBase64: string | undefined;
  const predictions = resp?.predictions || data.predictions || [];
  if (predictions.length > 0) {
    videoBase64 = predictions[0].bytesBase64Encoded || predictions[0].video?.bytesBase64Encoded;
  }
  if (!videoBase64) {
    const samples = resp?.generatedSamples || resp?.generated_samples || data.generatedSamples || data.generated_samples || [];
    if (samples.length > 0) {
      videoBase64 = samples[0].video?.bytesBase64Encoded || samples[0].bytesBase64Encoded;
    }
  }
  if (videoBase64) {
    return { done: true, videoBase64 };
  }

  // 2) Veo commonly returns a URI (usually gs://...) in several possible locations.
  const candidates: any[] = [
    resp?.videos?.[0],
    resp?.result?.videos?.[0],
    resp?.generatedVideos?.[0],
    resp?.generated_videos?.[0],
    resp?.generatedVideos?.[0]?.video,
    resp?.generated_videos?.[0]?.video,
    resp?.result?.generatedVideos?.[0]?.video,
    resp?.result?.generated_videos?.[0]?.video,
    predictions?.[0]?.video,
  ].filter(Boolean);

  for (const c of candidates) {
    const uri = c.gcsUri || c.uri || c.video?.gcsUri || c.video?.uri;
    const mimeType = c.mimeType || c.mime_type || c.video?.mimeType || c.video?.mime_type;

    if (typeof uri === "string" && uri.length > 0) {
      if (uri.startsWith("gs://")) {
        return { done: true, videoGcsUri: uri, mimeType };
      }
      return { done: true, videoUri: uri, mimeType };
    }
  }

  return { done: true, error: "Video format not recognized" };
}

function decodeBase64DataUriToBytes(input: string): { bytes: Uint8Array; contentType: string } {
  // Supports both raw base64 and data URIs like: data:video/mp4;base64,AAAA...
  let contentType = "video/mp4";
  let base64 = input;

  if (input.startsWith("data:")) {
    const match = input.match(/^data:([^;]+);base64,(.*)$/s);
    if (match) {
      contentType = match[1];
      base64 = match[2];
    }
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return { bytes, contentType };
}

async function downloadVideoUriToBytes(
  accessToken: string,
  uri: string,
): Promise<{ bytes: Uint8Array; contentType?: string }> {
  if (uri.startsWith("gs://")) {
    const bytes = await downloadGcsVideoToBytes(accessToken, uri);
    return { bytes };
  }

  const headers: HeadersInit = {};
  // If it's a GCS HTTPS URL (or similar), the token may be required.
  if (uri.includes("storage.googleapis.com")) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const resp = await fetch(uri, Object.keys(headers).length ? { headers } : undefined);
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Failed to download video URI: ${resp.status} ${t}`);
  }

  const contentType = resp.headers.get("content-type") || undefined;
  const buf = await resp.arrayBuffer();
  return { bytes: new Uint8Array(buf), contentType };
}

async function downloadGcsVideoToBytes(accessToken: string, gcsUri: string): Promise<Uint8Array> {
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid gcsUri: ${gcsUri}`);

  const bucket = match[1];
  const objectPath = match[2];
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Failed to download GCS video: ${resp.status} ${t}`);
  }

  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

// Upload video to storage
async function uploadVideoToStorage(
  supabase: any,
  videoBytes: Uint8Array,
  clientId: string,
  fileName: string,
  contentType: string,
): Promise<string> {
  const filePath = `${clientId}/reels/${fileName}`;

  const { error } = await supabase.storage
    .from("visual-creatives")
    .upload(filePath, videoBytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  const { data: publicUrl } = supabase.storage
    .from("visual-creatives")
    .getPublicUrl(filePath);

  return publicUrl.publicUrl;
}

// Update post progress in database
async function updateProgress(
  supabase: any,
  postId: string,
  status: string,
  progress: any,
) {
  await supabase
    .from("content_plan_posts")
    .update({
      reels_generation_status: status,
      reels_generation_progress: progress,
    })
    .eq("id", postId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const gcpJson = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
    if (!gcpJson) {
      throw new Error("GCP_SERVICE_ACCOUNT_JSON not configured");
    }

    const serviceAccount = JSON.parse(gcpJson);
    const projectId = serviceAccount.project_id;

    const body = await req.json();
    const { action, postId, clientId, companyId } = body;

    // ACTION: START - Begin multi-scene generation
    if (action === "start") {
      const { script, headline, subheadline } = body;

      if (!postId || !script) {
        throw new Error("postId and script are required");
      }

      console.log("Starting Reels video generation for post:", postId);

      // Parse script into scenes
      const scenes = parseScriptToScenes(script, headline || "", subheadline || "");
      console.log(`Parsed ${scenes.length} scenes from script`);

      // Initialize progress
      const progress = {
        clientId: clientId || null,
        companyId: companyId || null,
        totalScenes: scenes.length,
        currentScene: 0,
        scenes: scenes.map((s) => ({
          sceneNumber: s.sceneNumber,
          status: "pending",
          prompt: s.prompt,
          operationName: null,
          videoUrl: null,
        })),
        error: null,
      };

      await updateProgress(supabase, postId, "analyzing", progress);

      // Get access token
      const accessToken = await getGCPAccessToken(serviceAccount);

      // Start all video generations in parallel
      const operationPromises = scenes.map(async (scene, index) => {
        try {
          const operationName = await startSceneGeneration(accessToken, projectId, scene.prompt);
          progress.scenes[index].operationName = operationName;
          progress.scenes[index].status = "generating";
          return { index, operationName, error: null };
        } catch (error: any) {
          progress.scenes[index].status = "error";
          progress.scenes[index].error = error.message;
          return { index, operationName: null, error: error.message };
        }
      });

      const results = await Promise.all(operationPromises);
      
      // Update progress with operation names
      await updateProgress(supabase, postId, "generating", progress);

      return new Response(
        JSON.stringify({
          success: true,
          postId,
          totalScenes: scenes.length,
          operations: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: STATUS - Check progress of all scenes
    if (action === "status") {
      if (!postId) {
        return new Response(
          JSON.stringify({ error: "postId is required", status: "idle", progress: {} }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get current progress from database
      const { data: post, error: fetchError } = await supabase
        .from("content_plan_posts")
        .select("reels_generation_status, reels_generation_progress")
        .eq("id", postId)
        .single();

      if (fetchError || !post) {
        console.error("Post not found for status check:", postId, fetchError);
        return new Response(
          JSON.stringify({ status: "idle", progress: {}, error: "Post not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const progress = post.reels_generation_progress || {};
      const scenes = progress.scenes || [];

      if (scenes.length === 0) {
        return new Response(
          JSON.stringify({ status: post.reels_generation_status, progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check status of pending scenes
      const accessToken = await getGCPAccessToken(serviceAccount);
      let allDone = true;
      let hasError = false;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        if (scene.status === "generating" && scene.operationName) {
          try {
            const status = await checkOperationStatus(accessToken, scene.operationName, projectId);

            if (status.done) {
              if (status.error) {
                scene.status = "error";
                scene.error = status.error;
                hasError = true;
              } else if (status.videoBase64 || status.videoGcsUri || status.videoUri) {
                const resolvedClientId = progress.clientId || clientId;
                if (!resolvedClientId) {
                  throw new Error("clientId not available for video upload");
                }

                let videoBytes: Uint8Array;
                let contentType = status.mimeType || "video/mp4";

                if (status.videoBase64) {
                  const decoded = decodeBase64DataUriToBytes(status.videoBase64);
                  videoBytes = decoded.bytes;
                  contentType = decoded.contentType || contentType;
                } else {
                  const uri = (status.videoGcsUri || status.videoUri) as string;
                  const downloaded = await downloadVideoUriToBytes(accessToken, uri);
                  videoBytes = downloaded.bytes;
                  contentType = downloaded.contentType || contentType;
                }

                const ext = contentType.includes("webm") ? "webm" : "mp4";
                const videoUrl = await uploadVideoToStorage(
                  supabase,
                  videoBytes,
                  resolvedClientId,
                  `scene-${scene.sceneNumber}-${Date.now()}.${ext}`,
                  contentType,
                );

                scene.videoUrl = videoUrl;
                scene.status = "completed";
                progress.currentScene = (progress.currentScene || 0) + 1;
              }
            } else {
              allDone = false;
            }
          } catch (error: any) {
            console.error(`Error checking scene ${scene.sceneNumber}:`, error);

            const msg = String(error?.message || error);
            // If we can't parse/download/upload the result, it's not transient for this run.
            if (
              msg.includes("Video format not recognized") ||
              msg.includes("Invalid gcsUri") ||
              msg.includes("Failed to download") ||
              msg.includes("Failed to upload")
            ) {
              scene.status = "error";
              scene.error = msg;
              hasError = true;
            } else {
              // Treat unknown failures as transient
              allDone = false;
            }

            allDone = false;
          }
        } else if (scene.status === "pending") {
          allDone = false;
        }
      }

      // Update status
      let newStatus = "generating";
      if (allDone) {
        const completedScenes = scenes.filter((s: any) => s.status === "completed");
        if (completedScenes.length === scenes.length) {
          newStatus = "completed";
        } else if (hasError) {
          newStatus = "error";
        }
      }

      await updateProgress(supabase, postId, newStatus, progress);

      return new Response(
        JSON.stringify({
          status: newStatus,
          progress,
          allDone,
          completedScenes: scenes.filter((s: any) => s.status === "completed").length,
          totalScenes: scenes.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: RESET - Cancel/reset generation
    if (action === "reset") {
      await updateProgress(supabase, postId, "idle", {});
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("Error in generate-reels-video:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
