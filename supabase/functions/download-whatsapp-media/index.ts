import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  // Preferred (UazapiGO): instanceId + messageId
  instanceId?: string | null;
  messageId?: string | null;

  // Fallback: direct media URL
  mediaUrl?: string | null;

  // Optional
  fileName?: string | null;
};

function safeFileName(input: string | null | undefined) {
  const name = (input || "download").trim();
  // Avoid header injection / invalid chars
  return name.replace(/[\r\n"\\]/g, "_");
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: Payload = await req.json();
    const fileName = safeFileName(payload.fileName);

    // 1) UazapiGO flow: call /message/download using message ID
    if (payload.instanceId && payload.messageId) {
      console.log("[download-whatsapp-media] UazapiGO flow", {
        instanceId: payload.instanceId,
        messageId: payload.messageId,
        fileName,
      });

      const { data: instance, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("company_id, uazapi_token")
        .eq("id", payload.instanceId)
        .single();

      if (instanceError || !instance) {
        console.error("[download-whatsapp-media] Instance not found:", instanceError);
        return new Response(JSON.stringify({ error: "Instância não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!instance.uazapi_token) {
        return new Response(JSON.stringify({ error: "Token da instância não encontrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config, error: configError } = await supabase
        .from("whatsapp_configs")
        .select("uazapi_endpoint")
        .eq("company_id", instance.company_id)
        .single();

      if (configError || !config?.uazapi_endpoint) {
        console.error("[download-whatsapp-media] Config not found:", configError);
        return new Response(JSON.stringify({ error: "Configuração base do WhatsApp não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
      const downloadEndpoint = `${endpoint}/message/download`;

      console.log("[download-whatsapp-media] Calling UazapiGO:", downloadEndpoint);

      const uazapiResp = await fetch(downloadEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "token": instance.uazapi_token,
        },
        body: JSON.stringify({
          id: payload.messageId,
          return_link: true,
          return_base64: false,
          generate_mp3: true,
        }),
      });

      const uazapiText = await uazapiResp.text();
      console.log("[download-whatsapp-media] UazapiGO status:", uazapiResp.status);
      console.log("[download-whatsapp-media] UazapiGO response preview:", uazapiText.substring(0, 500));

      if (!uazapiResp.ok) {
        return new Response(JSON.stringify({ error: "Falha ao baixar mídia na UazapiGO", details: uazapiText }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let uazapiData: any;
      try {
        uazapiData = JSON.parse(uazapiText);
      } catch (e) {
        console.error("[download-whatsapp-media] Invalid JSON from UazapiGO", e);
        return new Response(JSON.stringify({ error: "Resposta inválida da UazapiGO" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fileURL: string | null = uazapiData.fileURL || uazapiData.fileUrl || null;
      const mimetype: string | null = uazapiData.mimetype || uazapiData.mimeType || null;
      const base64Data: string | null = uazapiData.base64Data || null;

      let bytes: Uint8Array;
      const originalContentType = mimetype || "application/octet-stream";

      if (fileURL) {
        console.log("[download-whatsapp-media] Fetching public fileURL:", fileURL);
        const fileResp = await fetch(fileURL);
        if (!fileResp.ok) {
          const errText = await fileResp.text();
          console.error("[download-whatsapp-media] fileURL fetch failed:", fileResp.status, errText.substring(0, 200));
          return new Response(JSON.stringify({ error: "Falha ao baixar arquivo final", details: errText }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Note: we always return application/octet-stream so supabase-js returns a Blob reliably.
        bytes = new Uint8Array(await fileResp.arrayBuffer());
      } else if (base64Data) {
        console.log("[download-whatsapp-media] Using base64Data payload");
        bytes = decodeBase64ToUint8Array(base64Data);
      } else {
        return new Response(JSON.stringify({ error: "UazapiGO não retornou fileURL/base64Data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[download-whatsapp-media] Returning bytes:", bytes.byteLength);

      return new Response(bytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "X-Original-Content-Type": originalContentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": bytes.byteLength.toString(),
        },
      });
    }

    // 2) Fallback: direct URL fetch
    if (payload.mediaUrl) {
      console.log("[download-whatsapp-media] Direct URL flow", { mediaUrl: payload.mediaUrl, fileName });
      const response = await fetch(payload.mediaUrl);

      if (!response.ok) {
        const t = await response.text();
        return new Response(JSON.stringify({ error: `Falha ao buscar mediaUrl`, details: t }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fileBuffer = await response.arrayBuffer();
      const originalContentType = response.headers.get("content-type") || "application/octet-stream";

      return new Response(fileBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "X-Original-Content-Type": originalContentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.byteLength.toString(),
        },
      });
    }

    return new Response(JSON.stringify({ error: "Informe instanceId+messageId (UazapiGO) ou mediaUrl" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[download-whatsapp-media] Unhandled error:", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
