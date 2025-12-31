import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATION = "us-central1";

// Modelos Veo suportados e suas configurações
const VEO_MODELS: Record<string, { id: string; durations: number[] }> = {
  "veo-2.0": { id: "veo-2.0-generate-001", durations: [5, 6, 7, 8] },
  "veo-3.1": { id: "veo-3.0-generate-preview", durations: [5, 6, 7, 8] },
};

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

  // Parse PEM private key
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

// Obter access token do GCP
async function getGCPAccessToken(serviceAccount: any): Promise<string> {
  const signedJwt = await createSignedJWT(serviceAccount);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token exchange error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Validar parâmetros antes de chamar a API
function validateVideoParams(model: string, duration: number, aspectRatio: string): string | null {
  const modelConfig = VEO_MODELS[model];
  if (!modelConfig) {
    return `Modelo "${model}" não suportado. Use: ${Object.keys(VEO_MODELS).join(", ")}`;
  }

  if (!modelConfig.durations.includes(duration)) {
    return `Duração ${duration}s não suportada para ${model}. Use: ${modelConfig.durations.join(", ")}`;
  }

  const validAspectRatios = ["16:9", "9:16"];
  if (!validAspectRatios.includes(aspectRatio)) {
    return `Aspect ratio "${aspectRatio}" não suportado. Use: ${validAspectRatios.join(", ")}`;
  }

  return null;
}

// Iniciar geração de vídeo com Veo
async function startVideoGeneration(
  accessToken: string,
  projectId: string,
  prompt: string,
  options: {
    model?: string;
    aspectRatio?: string;
    duration?: number;
    imageReference?: string;
    negativePrompt?: string;
  },
): Promise<string> {
  const { model = "veo-2.0", aspectRatio = "9:16", duration = 5, imageReference, negativePrompt } = options;

  // Obter o ID do modelo
  const modelConfig = VEO_MODELS[model] || VEO_MODELS["veo-2.0"];
  const modelId = modelConfig.id;

  const endpoint =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${modelId}:predictLongRunning`;

  const requestBody: any = {
    instances: [{
      prompt: prompt,
    }],
    parameters: {
      aspectRatio: aspectRatio,
      durationSeconds: duration,
      sampleCount: 1,
    },
  };

  // Adicionar negativePrompt se fornecido (para evitar texto no vídeo)
  if (negativePrompt) {
    requestBody.parameters.negativePrompt = negativePrompt;
    console.log("Using negativePrompt:", negativePrompt);
  }

  // Se tiver referência de imagem (image-to-video)
  if (imageReference) {
    requestBody.instances[0].image = {
      bytesBase64Encoded: imageReference.replace(/^data:image\/\w+;base64,/, ""),
    };
  }

  console.log("Starting video generation with Vertex AI:", { model, modelId, aspectRatio, duration, endpoint });

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
  console.log("Video generation started, operationName:", data.name);

  // Retorna o nome da operação para polling
  return data.name;
}

// Extrair modelId do operationName
// Ex: "projects/my-proj/locations/us-central1/publishers/google/models/veo-2.0-generate-001/operations/abc123"
function extractModelIdFromOperationName(operationName: string): string | null {
  const match = operationName.match(/\/models\/([^/]+)\/operations\//);
  return match ? match[1] : null;
}

// Verificar status da operação usando fetchPredictOperation
async function checkOperationStatus(
  accessToken: string,
  operationName: string,
  projectId: string,
): Promise<{ done: boolean; videoBase64?: string; error?: string }> {
  // Extrair modelId do operationName
  const modelId = extractModelIdFromOperationName(operationName);
  
  if (!modelId) {
    console.error("Could not extract modelId from operationName:", operationName);
    throw new Error(`Invalid operationName format: ${operationName}`);
  }

  // Usar o endpoint :fetchPredictOperation (POST) conforme documentação do Veo
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${modelId}:fetchPredictOperation`;

  console.log("Polling operation status:", { endpoint, operationName, modelId });

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
    console.error("fetchPredictOperation error:", { status: response.status, body: errorText });
    throw new Error(`Operation check error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log("Operation status response:", { done: data.done, hasError: !!data.error, hasResponse: !!data.response });

  if (data.done === false || data.done === undefined && !data.response && !data.error) {
    return { done: false };
  }

  if (data.error) {
    const errorMessage = data.error.message || JSON.stringify(data.error);
    console.error("Video generation error:", errorMessage);
    return { done: true, error: errorMessage };
  }

  // Tentar extrair o vídeo base64 da resposta
  // A estrutura pode variar, então tentamos vários caminhos possíveis
  let videoBase64: string | undefined;

  // Formato 1: response.predictions[].bytesBase64Encoded
  const predictions = data.response?.predictions || data.predictions || [];
  if (predictions.length > 0) {
    videoBase64 = predictions[0].bytesBase64Encoded || predictions[0].video?.bytesBase64Encoded;
  }

  // Formato 2: response.videos[].bytesBase64Encoded
  if (!videoBase64) {
    const videos = data.response?.videos || data.videos || [];
    if (videos.length > 0) {
      videoBase64 = videos[0].bytesBase64Encoded;
    }
  }

  // Formato 3: response.generatedSamples[].video.bytesBase64Encoded
  if (!videoBase64) {
    const samples = data.response?.generatedSamples || data.generatedSamples || [];
    if (samples.length > 0) {
      videoBase64 = samples[0].video?.bytesBase64Encoded || samples[0].bytesBase64Encoded;
    }
  }

  if (videoBase64) {
    console.log("Video generated successfully, base64 length:", videoBase64.length);
    return { done: true, videoBase64 };
  }

  // Log completo da resposta para debug (sem o base64 gigante)
  const debugResponse = JSON.stringify(data, (key, value) => {
    if (typeof value === 'string' && value.length > 100) {
      return `[string of ${value.length} chars]`;
    }
    return value;
  });
  console.log("Full response structure:", debugResponse);

  return { done: true, error: "Operação concluída, mas formato de resposta não reconhecido." };
}

// Upload do vídeo para Supabase Storage
async function uploadVideoToStorage(
  supabase: any,
  base64Video: string,
  clientId: string,
): Promise<string> {
  const fileName = `${clientId}/${Date.now()}-video.mp4`;

  // Converter base64 para Uint8Array
  const binaryString = atob(base64Video);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from("visual-creatives")
    .upload(fileName, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  const { data: publicUrl } = supabase.storage
    .from("visual-creatives")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
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

    const handleStatusCheck = async (operationName: string, creativeId?: string | null) => {
      console.log("Checking status for:", { operationName, creativeId });
      
      const accessToken = await getGCPAccessToken(serviceAccount);
      const status = await checkOperationStatus(accessToken, operationName, projectId);

      // Concluiu com erro
      if (status.done && status.error) {
        console.log("Generation failed with error:", status.error);
        
        if (creativeId) {
          await supabase
            .from("visual_creatives")
            .update({
              status: "error",
              generation_operation_id: null,
            })
            .eq("id", creativeId);
        }

        return new Response(
          JSON.stringify({ done: true, error: status.error, status: "error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Concluiu com vídeo
      if (status.done && status.videoBase64 && creativeId) {
        console.log("Video completed, uploading to storage...");
        
        const { data: creative } = await supabase
          .from("visual_creatives")
          .select("client_id")
          .eq("id", creativeId)
          .single();

        if (creative?.client_id) {
          const videoUrl = await uploadVideoToStorage(supabase, status.videoBase64, creative.client_id);
          console.log("Video uploaded:", videoUrl);

          await supabase
            .from("visual_creatives")
            .update({
              video_url: videoUrl,
              status: "completed",
              generation_operation_id: null,
            })
            .eq("id", creativeId);

          return new Response(
            JSON.stringify({ done: true, videoUrl, status: "completed" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      // Ainda processando
      console.log("Still processing...");
      return new Response(JSON.stringify({ done: false, status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    const url = new URL(req.url);

    // GET - Verificar status de operação
    if (req.method === "GET") {
      const operationName = url.searchParams.get("operationName");
      const creativeId = url.searchParams.get("creativeId");

      if (!operationName) {
        throw new Error("operationName is required");
      }

      return await handleStatusCheck(operationName, creativeId);
    }

    // POST - Iniciar geração OU checar status via POST
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Status check via POST
      if (body?.operationName && body?.creativeId && !body?.clientId) {
        return await handleStatusCheck(body.operationName, body.creativeId);
      }

      const {
        clientId,
        companyId,
        theme,
        creativeType,
        aspectRatio = "9:16",
        duration = 5,
        model = "veo-2.0",
        noTextInVideo = false,
        imageReference,
        clientName,
        title,
        description,
      } = body;

      if (!clientId || !companyId || !theme) {
        throw new Error("clientId, companyId, and theme are required");
      }

      // Validar parâmetros
      const validationError = validateVideoParams(model, duration, aspectRatio);
      if (validationError) {
        return new Response(
          JSON.stringify({ error: validationError }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("Video generation request:", { clientId, companyId, theme, aspectRatio, duration, model });

      // Criar registro do criativo em status "generating"
      const { data: newCreative, error: insertError } = await supabase
        .from("visual_creatives")
        .insert({
          company_id: companyId,
          client_id: clientId,
          client_name: clientName || "Cliente",
          creative_type: creativeType || "video_vertical",
          theme: theme,
          title: title || theme,
          description: description || theme,
          media_type: "video",
          status: "generating",
          video_duration_seconds: duration,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to create creative record: ${insertError.message}`);
      }

      // Obter access token
      const accessToken = await getGCPAccessToken(serviceAccount);

      // Construir prompt para o vídeo
      // Se noTextInVideo=true, colocar instrução NO INÍCIO do prompt (maior peso) + usar negativePrompt
      const noTextInstruction = noTextInVideo 
        ? "CRITICAL: Generate a purely VISUAL video with absolutely NO TEXT, NO TITLES, NO CAPTIONS, NO WORDS, NO LETTERS, NO OVERLAYS, NO LOGOS, NO BRAND MARKS, NO COMPANY LOGOS, NO GRAPHIC ELEMENTS WITH BRANDING of any kind. The video must contain ONLY visual scenes without any identifying marks or text. " 
        : "";
      const videoPrompt = `${noTextInstruction}Create a professional marketing video for: ${theme}.\nStyle: Modern, engaging, suitable for social media marketing.\nDuration: ${duration} seconds.\nAspect ratio: ${aspectRatio}.\nMake it visually appealing and attention-grabbing.`;

      // negativePrompt para reforçar exclusão de texto E logos
      const negativePrompt = noTextInVideo 
        ? "text, titles, captions, subtitles, overlays, words, letters, typography, watermarks, logos, brand logos, company logos, brand marks, corporate identity, brand elements, graphic logos, emblems, insignias, written content, signs with text, any written words, lettering, headlines, slogans, trademarks, brand symbols" 
        : undefined;

      console.log("Video prompt:", videoPrompt);
      if (negativePrompt) console.log("Negative prompt:", negativePrompt);

      // Iniciar geração
      const operationName = await startVideoGeneration(accessToken, projectId, videoPrompt, {
        model,
        aspectRatio,
        duration,
        imageReference,
        negativePrompt,
      });

      // Atualizar criativo com o operation ID
      await supabase
        .from("visual_creatives")
        .update({ generation_operation_id: operationName })
        .eq("id", newCreative.id);

      return new Response(
        JSON.stringify({
          success: true,
          creativeId: newCreative.id,
          operationName: operationName,
          status: "generating",
          estimatedTime: duration > 5 ? 120 : 60,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in generate-video-creative:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
