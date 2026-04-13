import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");
  text = text.replace(/<\/?(p|div|li|h[1-6]|br|tr)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { url, company_id } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL é obrigatória" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "URL inválida" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Apenas URLs HTTP/HTTPS são suportadas",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Busca o conteúdo da URL
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ExpxFlowBot/1.0; +https://expxflow.com.br)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao acessar URL: ${response.status} ${response.statusText}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const html = await response.text();
    const rawText = extractText(html);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch
      ? titleMatch[1].trim().replace(/\s+/g, " ")
      : parsedUrl.hostname;
    const content = rawText.slice(0, 5000);

    // 2. Chama LLM para analisar e sugerir configurações do carrossel
    const systemPrompt = `Você é um especialista em marketing de conteúdo para Instagram.
Analise o conteúdo fornecido e sugira a melhor configuração para criar um carrossel do Instagram.
Responda SOMENTE com JSON válido, sem markdown, sem explicações.`;

    const userPrompt = `Analise este conteúdo e retorne a configuração ideal para um carrossel do Instagram:

Título da página: ${pageTitle}
URL: ${url}

Conteúdo:
${content}

Retorne EXATAMENTE este JSON (sem markdown):
{
  "prompt": "descrição concisa e otimizada do tema do carrossel para a IA gerar, em português, máximo 300 chars",
  "slidesCount": <número entre 4 e 10 que faça sentido para o conteúdo>,
  "imageMode": <"none" | "background" | "grid" | "both" — escolha o que melhor combina com o tipo de conteúdo>,
  "imageStyle": "estilo visual recomendado para as imagens, em português, máximo 100 chars",
  "rationale": "explicação em 1-2 frases do por que essas configurações fazem sentido para este conteúdo"
}

Regras:
- imageMode "none": conteúdo muito textual (listas, dicas, tutoriais)
- imageMode "background": conteúdo inspiracional, storytelling, citações
- imageMode "grid": conteúdo com produtos, pessoas, lugares, exemplos visuais
- imageMode "both": conteúdo misto com informação + apelo visual`;

    const aiResponse = await callAI({
      functionName: "analyze-carousel-from-url",
      companyId: company_id ?? null,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const aiText = aiResponse.trim();
    // Remove possível markdown code block
    const jsonText = aiText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let suggestion: {
      prompt: string;
      slidesCount: number;
      imageMode: string;
      imageStyle: string;
      rationale: string;
    };

    try {
      suggestion = JSON.parse(jsonText);
    } catch {
      // Fallback: extrai JSON da resposta
      const match = aiText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("IA não retornou JSON válido");
      suggestion = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pageTitle,
        url,
        suggestion: {
          prompt: suggestion.prompt ?? "",
          slidesCount: Math.min(
            10,
            Math.max(1, Number(suggestion.slidesCount) || 6),
          ),
          imageMode: ["none", "background", "grid", "both"].includes(
            suggestion.imageMode,
          )
            ? suggestion.imageMode
            : "background",
          imageStyle: suggestion.imageStyle ?? "",
          rationale: suggestion.rationale ?? "",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = (error as Error).message;
    const isTimeout =
      msg.includes("timeout") || msg.includes("signal is aborted");
    console.error("[analyze-carousel-from-url] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Tempo limite atingido ao acessar a URL"
          : msg || "Erro ao analisar URL",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
