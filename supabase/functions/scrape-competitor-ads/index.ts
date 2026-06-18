// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";
import {
  getSystemConfig,
  resolveCredential,
  type SystemConfigTools,
} from "../_shared/getSystemConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  console.log("=== SCRAPE FUNCTION STARTED ===");
  console.log("Method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Processing POST request ===");

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully:", requestBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { url, competitorId, competitorName } = requestBody;
    console.log("Extracted data:", { url, competitorId, competitorName });

    if (!url) {
      throw new Error("URL é obrigatória");
    }

    // Check required API keys
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const toolsCfg = await getSystemConfig<SystemConfigTools>(
      supabase,
      "tools",
    );
    const firecrawlApiKey = resolveCredential(
      Deno.env.get("FIRECRAWL_API_KEY"),
      toolsCfg?.firecrawl_api_key,
      "Firecrawl API Key não configurada. Acesse Configurações > Sistema > Ferramentas.",
    );
    console.log("Firecrawl API Key available:", !!firecrawlApiKey);

    // Step 1: Get raw content from Firecrawl
    console.log("Making request to Firecrawl API...");
    const firecrawlResponse = await fetch(
      "https://api.firecrawl.dev/v0/scrape",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          pageOptions: {
            includeHtml: false,
            onlyMainContent: true,
            waitFor: 3000,
          },
        }),
      },
    );

    console.log("Firecrawl response status:", firecrawlResponse.status);

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error("Firecrawl error:", errorText);
      throw new Error(`Firecrawl API error: ${errorText}`);
    }

    const firecrawlData = await firecrawlResponse.json();

    if (!firecrawlData.success) {
      console.error("Firecrawl returned success=false:", firecrawlData.error);
      throw new Error(firecrawlData.error || "Erro no Firecrawl");
    }

    const rawContent = firecrawlData.data?.content || "";
    console.log("Raw content length:", rawContent.length);

    if (rawContent.length < 100) {
      throw new Error("Conteúdo muito pequeno extraído da página");
    }

    // Step 2: Send raw content to AI for processing
    console.log("Sending content to AI for processing...");
    const aiResult = await callAI({
      functionName: "scrape-competitor-ads",
      systemPrompt: `Você é um especialista em análise de dados da Biblioteca de Anúncios do Facebook.

Sua tarefa é extrair APENAS os anúncios reais de uma página e retornar um JSON estruturado.

IGNORE completamente:
- Links de navegação como "Meta Ad Library", "Ad Library Report", "Ad Library API"
- Elementos de interface como "Brazil", "All ads", "Search by keyword"
- Menus e barras de navegação
- URLs ou links internos da biblioteca
- Rodapés e elementos de sistema

PROCURE APENAS por anúncios reais que contenham:
- Nome da empresa/página (ex: "Pen - Marketing para SaaS B2B")
- Texto promocional real (ex: "Gere leads qualificados para escalar seu SaaS")
- Call-to-action (ex: "Learn More", "Saiba mais")
- Library ID se disponível
- Data de início se disponível

Retorne um JSON no formato:
{
  "ads": [
    {
      "ad_title": "Nome da empresa",
      "ad_copy": "Texto principal do anúncio",
      "call_to_action": "Texto do botão",
      "ad_type": "video ou image",
      "platforms": "Facebook, Instagram",
      "library_id": "ID se disponível",
      "date_started": "Data se disponível"
    }
  ]
}

Se não encontrar anúncios reais, retorne {"ads": []}`,
      userPrompt: `Extraia os anúncios reais desta página da biblioteca de anúncios do Facebook:

${rawContent}`,
      temperature: 0.1,
      maxTokens: 4000,
    });

    const chatGptResponse = aiResult.content;

    console.log("ChatGPT response:", chatGptResponse);

    // Step 3: Parse ChatGPT response
    let extractedAds = [];
    try {
      // Clean any potential markdown formatting
      let cleanedResponse = chatGptResponse.trim();
      if (cleanedResponse.includes("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
      }

      // If the JSON is truncated (no closing brace), try to fix it
      if (!cleanedResponse.endsWith("}")) {
        console.log("JSON appears truncated, attempting to fix...");
        // Find the last complete ad object
        const lastCompleteAd = cleanedResponse.lastIndexOf("    }");
        if (lastCompleteAd > -1) {
          cleanedResponse =
            cleanedResponse.substring(0, lastCompleteAd + 5) + "\n  ]\n}";
        } else {
          cleanedResponse += "\n  ]\n}";
        }
      }

      console.log(
        "Attempting to parse cleaned response length:",
        cleanedResponse.length,
      );
      const parsedResponse = JSON.parse(cleanedResponse);

      if (parsedResponse.ads && Array.isArray(parsedResponse.ads)) {
        extractedAds = parsedResponse.ads.map((ad) => ({
          ad_title: ad.ad_title || "Título não disponível",
          ad_copy: ad.ad_copy || "Texto não disponível",
          call_to_action: ad.call_to_action || "Ver mais",
          ad_type: ad.ad_type || "unknown",
          estimated_performance: "medium",
          platforms: ad.platforms || "Facebook",
          notes: `Library ID: ${ad.library_id || "N/A"} | Data: ${ad.date_started || "N/A"}

Extraído automaticamente de: ${url}`,
        }));
      }
    } catch (parseError) {
      console.error("Failed to parse ChatGPT response:", parseError);
      console.error("Raw response:", chatGptResponse);

      // Try to extract at least partial data using regex as fallback
      const adMatches = chatGptResponse.match(/"ad_title":\s*"([^"]+)"/g);
      if (adMatches && adMatches.length > 0) {
        console.log(
          "Using regex fallback, found",
          adMatches.length,
          "potential ads",
        );
        extractedAds = [
          {
            ad_title: "Dados parciais extraídos",
            ad_copy:
              "Erro no processamento completo - dados parciais disponíveis",
            call_to_action: "Ver mais",
            ad_type: "unknown",
            estimated_performance: "medium",
            platforms: "Facebook",
            notes: `Erro de parsing - ${adMatches.length} anúncios detectados | Fonte: ${url}`,
          },
        ];
      } else {
        throw new Error("Erro ao processar resposta do ChatGPT");
      }
    }

    console.log("=== FINAL RESULT ===");
    console.log("Total ads extracted:", extractedAds.length);
    console.log("Ads:", extractedAds);

    return new Response(
      JSON.stringify({
        success: true,
        ads: extractedAds,
        originalUrl: url,
        competitorId: competitorId,
        message: `${extractedAds.length} anúncios extraídos com sucesso`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("=== ERROR IN FUNCTION ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.name,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
