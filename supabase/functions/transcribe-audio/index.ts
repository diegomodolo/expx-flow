import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranscribeRequest {
  messageId: string; // Supabase message ID
  instanceId: string;
  externalMessageId: string; // UazapiGO message ID
}

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// Generate JWT for Google Cloud authentication
async function getGoogleAccessToken(credentials: GoogleCredentials): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  let pemContents = credentials.private_key;
  pemContents = pemContents.replace(pemHeader, "").replace(pemFooter, "").replace(/\\n/g, "\n").replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const gcpCredentialsJson = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");

  if (!gcpCredentialsJson) {
    console.error("[transcribe-audio] GCP_SERVICE_ACCOUNT_JSON not configured");
    return new Response(JSON.stringify({ error: "Credenciais do Google Cloud não configuradas" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { messageId, instanceId, externalMessageId }: TranscribeRequest = await req.json();

    if (!messageId || !instanceId || !externalMessageId) {
      return new Response(JSON.stringify({ error: "messageId, instanceId e externalMessageId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[transcribe-audio] Starting transcription for message:", messageId);

    // Check if already transcribed
    const { data: existingMessage, error: msgError } = await supabase
      .from("whatsapp_messages")
      .select("audio_transcription, transcription_status, cached_media_url")
      .eq("id", messageId)
      .single();

    if (msgError) {
      console.error("[transcribe-audio] Error fetching message:", msgError);
      return new Response(JSON.stringify({ error: "Mensagem não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingMessage.audio_transcription) {
      console.log("[transcribe-audio] Already transcribed, returning existing");
      return new Response(
        JSON.stringify({ success: true, transcription: existingMessage.audio_transcription, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingMessage.transcription_status === "processing") {
      console.log("[transcribe-audio] Already processing");
      return new Response(JSON.stringify({ success: true, status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    await supabase.from("whatsapp_messages").update({ transcription_status: "processing" }).eq("id", messageId);

    // Get instance and config for downloading audio
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("company_id, uazapi_token")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      await supabase.from("whatsapp_messages").update({ transcription_status: "error" }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Instância não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint")
      .eq("company_id", instance.company_id)
      .single();

    if (configError || !config?.uazapi_endpoint) {
      await supabase.from("whatsapp_messages").update({ transcription_status: "error" }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Configuração do WhatsApp não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download audio from UazapiGO
    const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const downloadEndpoint = `${endpoint}/message/download`;

    console.log("[transcribe-audio] Downloading audio from UazapiGO...");

    const uazapiResp = await fetch(downloadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instance.uazapi_token,
      },
      body: JSON.stringify({
        id: externalMessageId,
        return_link: false,
        return_base64: true,
        generate_mp3: true,
      }),
    });

    if (!uazapiResp.ok) {
      const errText = await uazapiResp.text();
      console.error("[transcribe-audio] UazapiGO download failed:", errText);
      await supabase.from("whatsapp_messages").update({ transcription_status: "error" }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Falha ao baixar áudio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uazapiData = await uazapiResp.json();
    const base64Audio = uazapiData.base64Data || uazapiData.base64;

    if (!base64Audio) {
      console.error("[transcribe-audio] No base64 audio returned from UazapiGO");
      await supabase.from("whatsapp_messages").update({ transcription_status: "error" }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Áudio não retornado pela API" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[transcribe-audio] Audio downloaded, size:", base64Audio.length);

    // Prepare Google Cloud Speech-to-Text request
    const credentials: GoogleCredentials = JSON.parse(gcpCredentialsJson);
    const accessToken = await getGoogleAccessToken(credentials);

    console.log("[transcribe-audio] Sending to Google Speech-to-Text...");

    const speechResponse = await fetch("https://speech.googleapis.com/v1/speech:recognize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding: "MP3",
          sampleRateHertz: 16000,
          languageCode: "pt-BR",
          alternativeLanguageCodes: ["en-US", "es-ES"],
          enableAutomaticPunctuation: true,
          model: "latest_long",
        },
        audio: {
          content: base64Audio,
        },
      }),
    });

    const speechResult = await speechResponse.json();

    if (!speechResponse.ok) {
      console.error("[transcribe-audio] Google Speech error:", speechResult);
      await supabase.from("whatsapp_messages").update({ transcription_status: "error" }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Erro na transcrição", details: speechResult }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract transcription text
    let transcription = "";
    if (speechResult.results && speechResult.results.length > 0) {
      transcription = speechResult.results
        .map((result: any) => result.alternatives?.[0]?.transcript || "")
        .join(" ")
        .trim();
    }

    console.log("[transcribe-audio] Transcription result:", transcription.substring(0, 100));

    // Save transcription to database
    const { error: updateError } = await supabase
      .from("whatsapp_messages")
      .update({
        audio_transcription: transcription || "(sem fala detectada)",
        transcription_status: "completed",
      })
      .eq("id", messageId);

    if (updateError) {
      console.error("[transcribe-audio] Error saving transcription:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcription || "(sem fala detectada)",
        status: "completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[transcribe-audio] Unhandled error:", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
