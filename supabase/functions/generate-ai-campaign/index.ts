import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Audience {
  id: string;
  name: string;
  type?: string;
}

interface Pixel {
  id: string;
  name: string;
}

interface RequestBody {
  clientId: string;
  companyId: string;
  briefing: string;
  monthlyBudget: number; // This is now the AVAILABLE budget
  currentSpend?: number;
  totalMonthlyBudget?: number;
  websiteUrl?: string;
  productName?: string;
  targetAudience?: string;
  sector?: string;
  preferredObjective?: string;
  creativesCount?: number;
  availableAudiences: Audience[];
  availablePixels: Pixel[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const {
      briefing,
      monthlyBudget, // This is the AVAILABLE budget now
      currentSpend = 0,
      totalMonthlyBudget = 0,
      websiteUrl,
      productName,
      targetAudience,
      sector,
      preferredObjective,
      creativesCount = 1,
      availableAudiences,
      availablePixels,
    } = body;

    if (!briefing) {
      return new Response(
        JSON.stringify({ success: false, error: "Briefing não disponível" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the available budget (monthlyBudget is already the remaining amount)
    // Calculate daily budget from available monthly budget (divide by 30 days)
    const suggestedDailyBudget = monthlyBudget > 0 
      ? Math.round(monthlyBudget / 30) 
      : 10; // Minimum fallback

    console.log(`Budget calculation: Available=${monthlyBudget}, CurrentSpend=${currentSpend}, TotalMonthly=${totalMonthlyBudget}, SuggestedDaily=${suggestedDailyBudget}`);

    // Build the prompt
    const systemPrompt = `Você é um especialista em marketing digital e Meta Ads com vasta experiência em criar campanhas de alta performance. Seu objetivo é analisar o briefing do cliente e gerar uma campanha completa e otimizada.

REGRAS IMPORTANTES:
1. Baseie todas as decisões no briefing fornecido
2. Use linguagem persuasiva mas natural
3. Respeite o tom de voz do cliente
4. Sugira públicos disponíveis quando fizer sentido
5. Sempre inclua parâmetros UTM
6. Mantenha textos dentro dos limites: título (40 chars), texto principal (125 chars recomendado, max 500)
7. Se houver pixel disponível, sempre use
8. Escolha o evento de conversão adequado ao objetivo`;

    const userPrompt = `BRIEFING DO CLIENTE:
${briefing}

DADOS ADICIONAIS:
- Produto/Serviço: ${productName || "Não especificado"}
- Setor: ${sector || "Não especificado"}
- Público-alvo: ${targetAudience || "Ver briefing"}
- Website: ${websiteUrl || "Não informado"}
- Orçamento mensal TOTAL: R$ ${totalMonthlyBudget || 0}
- Orçamento já COMPROMETIDO em campanhas ativas: R$ ${currentSpend}
- Orçamento DISPONÍVEL para esta campanha: R$ ${monthlyBudget}
- Orçamento diário sugerido: R$ ${suggestedDailyBudget}
- QUANTIDADE DE CRIATIVOS PARA GERAR: ${creativesCount}
${preferredObjective ? `- Objetivo preferido: ${preferredObjective}` : "- Objetivo: A IA deve decidir o melhor"}

PÚBLICOS DISPONÍVEIS PARA INCLUSÃO:
${availableAudiences.length > 0 
  ? availableAudiences.map(a => `- ${a.name} (ID: ${a.id}, Tipo: ${a.type || 'custom'})`).join('\n')
  : "Nenhum público customizado disponível"}

PIXELS DISPONÍVEIS:
${availablePixels.length > 0 
  ? availablePixels.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')
  : "Nenhum pixel configurado"}

Gere uma campanha completa no seguinte formato JSON:

{
  "campaign": {
    "name": "Nome criativo e descritivo da campanha",
    "objective": "OUTCOME_SALES | OUTCOME_LEADS | OUTCOME_TRAFFIC | OUTCOME_ENGAGEMENT | OUTCOME_AWARENESS",
    "budgetType": "daily",
    "budgetValue": ${suggestedDailyBudget},
    "status": "PAUSED"
  },
  "adSet": {
    "name": "Nome do conjunto baseado no público",
    "includedAudiences": ["IDs dos públicos sugeridos para inclusão"],
    "excludedAudiences": ["IDs dos públicos sugeridos para exclusão"],
    "ageMin": 18,
    "ageMax": 65,
    "genders": [0],
    "pixelId": "ID do pixel se disponível",
    "conversionEvent": "PURCHASE | LEAD | COMPLETE_REGISTRATION | ADD_TO_CART | INITIATE_CHECKOUT | SEARCH | VIEW_CONTENT | CONTACT | CUSTOMIZE_PRODUCT | DONATE | FIND_LOCATION | SCHEDULE | START_TRIAL | SUBMIT_APPLICATION | SUBSCRIBE"
  },
  "creatives": [
    ${Array.from({ length: creativesCount }, (_, i) => `{
      "body": "Texto principal do anúncio ${i + 1} (máximo 500 caracteres, ideal 125)",
      "title": "Título chamativo ${i + 1} (máximo 40 caracteres)",
      "description": "Descrição complementar ${i + 1}",
      "callToAction": "LEARN_MORE | SHOP_NOW | SIGN_UP | SUBSCRIBE | CONTACT_US | GET_OFFER | BOOK_TRAVEL | DOWNLOAD | APPLY_NOW | WHATSAPP_MESSAGE",
      "urlParameters": {
        "utm_source": "facebook",
        "utm_medium": "paid",
        "utm_campaign": "nome-da-campanha"
      }
    }`).join(',\n    ')}
  ],
  "imagePrompt": "Descrição detalhada para gerar uma imagem de anúncio profissional"
}

IMPORTANTE: 
- O orçamento diário DEVE ser no máximo R$ ${suggestedDailyBudget} (baseado no orçamento DISPONÍVEL do cliente)
- NÃO use o orçamento total do cliente, use APENAS o orçamento disponível informado acima
- Retorne APENAS o JSON, sem explicações adicionais
- Use IDs reais dos públicos e pixels fornecidos
- Para genders: [0] = todos, [1] = masculino, [2] = feminino, [1,2] = ambos especificamente
- Escolha o conversionEvent baseado no objetivo da campanha
- O imagePrompt deve descrever uma imagem de anúncio profissional que represente o produto/serviço
- GERE EXATAMENTE ${creativesCount} criativos diferentes no array "creatives", cada um com texto e título únicos`;

    console.log("Calling Lovable AI for campaign generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing JSON...");

    // Extract JSON from the response (handle markdown code blocks)
    let jsonString = content.trim();
    
    // Try to extract from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }
    
    // If still starts with ```, try to clean it up
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?[\s\n]*/, '').replace(/```$/, '').trim();
    }
    
    // Try to find JSON object boundaries
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    console.log("Cleaned JSON string (first 500 chars):", jsonString.substring(0, 500));

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 1000));
      console.error("Cleaned JSON that failed:", jsonString.substring(0, 1000));
      throw new Error("Resposta da IA em formato inválido");
    }

    // Transform to the expected format
    // Handle both old format (single creative) and new format (creatives array)
    const creativesArray = parsedData.creatives || (parsedData.creative ? [parsedData.creative] : []);
    
    const generatedCreatives = creativesArray.length > 0 
      ? creativesArray.map((creative: any) => ({
          id: crypto.randomUUID(),
          type: "IMAGE" as const,
          mediaUrls: [],
          body: creative?.body || "",
          title: creative?.title || "",
          description: creative?.description || "",
          linkUrl: websiteUrl || "",
          callToAction: creative?.callToAction || "LEARN_MORE",
          urlParameters: creative?.urlParameters || {
            utm_source: "facebook",
            utm_medium: "paid",
            utm_campaign: parsedData.campaign?.name?.toLowerCase().replace(/\s+/g, "-") || "campanha-ia",
          },
        }))
      : [{
          id: crypto.randomUUID(),
          type: "IMAGE" as const,
          mediaUrls: [],
          body: "",
          title: "",
          description: "",
          linkUrl: websiteUrl || "",
          callToAction: "LEARN_MORE",
          urlParameters: {
            utm_source: "facebook",
            utm_medium: "paid",
            utm_campaign: parsedData.campaign?.name?.toLowerCase().replace(/\s+/g, "-") || "campanha-ia",
          },
        }];

    const generatedData = {
      campaign: {
        name: parsedData.campaign?.name || "Campanha gerada por IA",
        objective: parsedData.campaign?.objective || "OUTCOME_TRAFFIC",
        budgetType: parsedData.campaign?.budgetType || "daily",
        budgetValue: parsedData.campaign?.budgetValue || suggestedDailyBudget,
        status: parsedData.campaign?.status || "PAUSED",
      },
      adSets: [
        {
          id: crypto.randomUUID(),
          name: parsedData.adSet?.name || "Conjunto Principal",
          includedAudiences: parsedData.adSet?.includedAudiences || [],
          excludedAudiences: parsedData.adSet?.excludedAudiences || [],
          ageMin: parsedData.adSet?.ageMin || 18,
          ageMax: parsedData.adSet?.ageMax || 65,
          genders: parsedData.adSet?.genders || [0],
          pixelId: parsedData.adSet?.pixelId || (availablePixels[0]?.id) || undefined,
          conversionEvent: parsedData.adSet?.conversionEvent || undefined,
          creatives: generatedCreatives,
        },
      ],
    };

    console.log(`Campaign generated successfully with ${generatedCreatives.length} creatives`);

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedData,
        imagePrompt: parsedData.imagePrompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-ai-campaign:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
