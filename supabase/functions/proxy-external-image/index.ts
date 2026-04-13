import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Baixa uma imagem externa e faz upload no bucket "visual-creatives"
// para contornar restrições de CORS ao renderizar via html2canvas.
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { url, company_id }: { url: string; company_id?: string } =
      await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "url é obrigatória" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "URL inválida" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(
        JSON.stringify({ success: false, error: "Apenas HTTP/HTTPS" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const imgRes = await fetch(url, {
      headers: {
        "User-Agent": "ExpxFlowBot/1.0",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!imgRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha ao baixar imagem: ${imgRes.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL não aponta para uma imagem",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const buffer = new Uint8Array(await imgRes.arrayBuffer());
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const folder = company_id ? `proxy/${company_id}` : "proxy/general";
    const path = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("visual-creatives")
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (upErr) throw upErr;

    const { data: pub } = supabase.storage
      .from("visual-creatives")
      .getPublicUrl(path);

    return new Response(
      JSON.stringify({ success: true, image_url: pub.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[proxy-external-image] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "Erro ao fazer proxy",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
