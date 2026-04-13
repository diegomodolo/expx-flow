import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const {
      company_id,
      query,
      per_page = 20,
      page = 1,
      orientation,
    }: {
      company_id: string;
      query: string;
      per_page?: number;
      page?: number;
      orientation?: "landscape" | "portrait" | "square";
    } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!query || typeof query !== "string" || !query.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "query é obrigatória" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: keyRow, error: keyErr } = await supabase
      .from("company_external_api_keys")
      .select("api_key")
      .eq("company_id", company_id)
      .eq("provider", "pexels")
      .maybeSingle();

    if (keyErr) throw keyErr;

    const apiKey = keyRow?.api_key?.trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "API key do Pexels não configurada. Vá em Configurações → API Keys Externas.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const params = new URLSearchParams({
      query: query.trim(),
      per_page: String(Math.min(80, Math.max(1, per_page))),
      page: String(Math.max(1, page)),
      locale: "pt-BR",
    });
    if (orientation) params.set("orientation", orientation);

    const pexelsUrl = `https://api.pexels.com/v1/search?${params.toString()}`;
    const pexelsRes = await fetch(pexelsUrl, {
      headers: { Authorization: apiKey },
    });

    if (!pexelsRes.ok) {
      const text = await pexelsRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Pexels erro ${pexelsRes.status}: ${text.slice(0, 200)}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload = (await pexelsRes.json()) as {
      total_results: number;
      page: number;
      per_page: number;
      next_page?: string;
      photos: PexelsPhoto[];
    };

    const photos = (payload.photos ?? []).map((p) => ({
      id: p.id,
      photographer: p.photographer,
      alt: p.alt,
      url_page: p.url,
      thumb: p.src.medium,
      large: p.src.large,
      original: p.src.original,
      width: p.width,
      height: p.height,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total: payload.total_results,
        page: payload.page,
        per_page: payload.per_page,
        has_next: !!payload.next_page,
        photos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[search-pexels-photos] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "Erro ao buscar fotos",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
