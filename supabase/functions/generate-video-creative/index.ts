import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATION = "us-central1";

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
  },
): Promise<string> {
  const { model = "veo-2.0", aspectRatio = "9:16", duration = 5, imageReference } = options;

  // Determinar endpoint baseado no modelo
  const modelEndpoint = model === "veo-3.1" ? "imagen-3.0-generate-002" : "veo-2.0-generate-001";

  // Importante: usar o host global aqui tende a retornar um Operation no formato padrão
  // (projects/.../locations/.../operations/...) para facilitar o polling.
  const endpoint =
    `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${modelEndpoint}:predictLongRunning`;

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

  // Se tiver referência de imagem (image-to-video)
  if (imageReference) {
    requestBody.instances[0].image = {
      bytesBase64Encoded: imageReference.replace(/^data:image\/\w+;base64,/, ""),
    };
  }

  console.log("Starting video generation with Vertex AI:", { model, aspectRatio, duration });

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
  console.log("Video generation started:", data);

  // Retorna o nome da operação para polling
  return data.name;
}

function getOperationUrlCandidates(operationName: string, projectId: string): string[] {
  const candidates: string[] = [];

  // 1) Usar exatamente o nome retornado pelo predictLongRunning
  candidates.push(`https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`);
  candidates.push(`https://aiplatform.googleapis.com/v1/${operationName}`);

  // 2) Também tentar o formato padrão de operações do Vertex AI:
  // projects/{project}/locations/{location}/operations/{opId}
  if (operationName.includes("/operations/")) {
    const opId = operationName.split("/operations/")[1];
    if (opId) {
      const normalized = `projects/${projectId}/locations/${LOCATION}/operations/${opId}`;
      candidates.push(`https://${LOCATION}-aiplatform.googleapis.com/v1/${normalized}`);
      candidates.push(`https://aiplatform.googleapis.com/v1/${normalized}`);
    }
  }

  return [...new Set(candidates)];
}

// Verificar status da operação
async function checkOperationStatus(
  accessToken: string,
  operationName: string,
  projectId: string,
): Promise<{ done: boolean; videoBase64?: string; error?: string }> {
  const urls = getOperationUrlCandidates(operationName, projectId);
  const errors: Array<{ url: string; status?: number; body?: string }> = [];

  for (const url of urls) {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push({ url, status: response.status, body: errorText });
      continue;
    }

    const data = await response.json();
    console.log("Operation status (ok):", { url, done: data?.done });

    if (data.done) {
      if (data.error) {
        return { done: true, error: data.error.message || "Video generation failed" };
      }

      const predictions = data.response?.predictions || [];
      if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
        return { done: true, videoBase64: predictions[0].bytesBase64Encoded };
      }

      return { done: true, error: "Operação concluída, mas não retornou vídeo." };
    }

    return { done: false };
  }

  console.error("Operation check failed for all candidates", errors.map((e) => ({ url: e.url, status: e.status })));
  throw new Error(`Operation check error: ${errors[0]?.body || "Unknown error"}`);
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
      const accessToken = await getGCPAccessToken(serviceAccount);
      const status = await checkOperationStatus(accessToken, operationName, projectId);

      // Concluiu com erro
      if (status.done && status.error) {
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
        const { data: creative } = await supabase
          .from("visual_creatives")
          .select("client_id")
          .eq("id", creativeId)
          .single();

        if (creative?.client_id) {
          const videoUrl = await uploadVideoToStorage(supabase, status.videoBase64, creative.client_id);

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
      return new Response(JSON.stringify({ done: false, status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    const url = new URL(req.url);

    // GET - (compat) Verificar status de operação
    if (req.method === "GET") {
      const operationName = url.searchParams.get("operationName");
      const creativeId = url.searchParams.get("creativeId");

      if (!operationName) {
        throw new Error("operationName is required");
      }

      return await handleStatusCheck(operationName, creativeId);
    }

    // POST - Iniciar geração OU checar status via POST (para facilitar o invoke do supabase)
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
        imageReference,
        clientName,
        title,
        description,
      } = body;

      if (!clientId || !companyId || !theme) {
        throw new Error("clientId, companyId, and theme are required");
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
      const videoPrompt = `Create a professional marketing video for: ${theme}.\nStyle: Modern, engaging, suitable for social media marketing.\nDuration: ${duration} seconds.\nAspect ratio: ${aspectRatio}.\nMake it visually appealing and attention-grabbing.`;

      // Iniciar geração
      const operationName = await startVideoGeneration(accessToken, projectId, videoPrompt, {
        model,
        aspectRatio,
        duration,
        imageReference,
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
