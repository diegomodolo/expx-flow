import { supabase } from "@/integrations/supabase/client";

/**
 * Baixa uma imagem externa e hospeda no Supabase Storage para evitar
 * problemas de CORS ao renderizar via html2canvas. Retorna a URL interna
 * ou a URL original em caso de falha (fallback gracioso).
 */
export async function proxyExternalImage(
  url: string,
  companyId?: string | null,
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "proxy-external-image",
      {
        body: { url, company_id: companyId ?? undefined },
      },
    );
    if (error) {
      console.warn("[proxyExternalImage] invoke error:", error);
      return url;
    }
    if (data?.success && data?.image_url) return data.image_url as string;
    console.warn("[proxyExternalImage] non-success:", data?.error);
    return url;
  } catch (err) {
    console.warn("[proxyExternalImage] exception:", err);
    return url;
  }
}
