import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIVision } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId, imageUrl } = await req.json();

    console.log(`Generating creative texts for client ${clientId} with image`);

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "imageUrl is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get client data including briefing and website
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(
        "name, company, ai_briefing, website_url, target_audience, product_name, voice_tone, objectives",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Client error:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Client not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Build system prompt with client context
    const systemPrompt = `Você é um especialista em marketing digital e copywriting para anúncios de Meta Ads (Facebook e Instagram).

Informações do cliente:
- Nome: ${client.name || "Não informado"}
- Empresa: ${client.company || "Não informada"}
- Produto/Serviço: ${client.product_name || "Não informado"}
- Público-alvo: ${client.target_audience || "Não informado"}
- Tom de voz: ${client.voice_tone || "Profissional e persuasivo"}
- Objetivos: ${client.objectives || "Gerar conversões"}
- Site: ${client.website_url || "Não informado"}

Briefing do cliente:
${client.ai_briefing || "Sem briefing específico. Crie um conteúdo persuasivo e profissional."}

Sua tarefa é analisar a imagem fornecida e criar textos para um anúncio baseado nela e no contexto do cliente.`;

    const userPrompt = `Analise esta imagem e crie os textos para um anúncio de Meta Ads.

Retorne exatamente no seguinte formato JSON (sem markdown, apenas o JSON):
{
  "body": "Texto principal do anúncio (entre 200 e 500 caracteres, persuasivo, envolvente e detalhado)",
  "title": "Título chamativo (máximo 40 caracteres)",
  "description": "Descrição adicional (entre 80 e 150 caracteres, complementando o título com mais detalhes)",
  "linkUrl": "${client.website_url || "https://"}",
  "callToAction": "CTA mais adequado entre: LEARN_MORE, SHOP_NOW, SIGN_UP, BOOK_NOW, CONTACT_US, DOWNLOAD, GET_QUOTE, APPLY_NOW, SUBSCRIBE, WATCH_MORE, SEND_MESSAGE, GET_OFFER"
}

Regras importantes:
- O texto principal (body) DEVE ter entre 200 e 500 caracteres. Seja persuasivo, conte uma história, destaque benefícios e crie conexão emocional
- O título deve ser impactante e direto, máximo 40 caracteres
- A descrição DEVE ter entre 80 e 150 caracteres, complementando o título com mais informações sobre a oferta
- O CTA deve ser o mais adequado para o objetivo do cliente e a imagem
- Adapte o tom de voz conforme o briefing do cliente
- A URL deve ser a do site do cliente, se disponível`;

    console.log("Calling AI Gateway with image...");

    const aiResult = await callAIVision({
      functionName: "generate-creative-texts",
      systemPrompt,
      userPrompt,
      images: [imageUrl],
    });

    const content = aiResult.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response content:", content);

    // Parse JSON from response
    let creativeData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        creativeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      throw new Error("Failed to parse AI response");
    }

    // Validate and sanitize the response
    const result = {
      body: (creativeData.body || "").slice(0, 500),
      title: (creativeData.title || "").slice(0, 40),
      description: (creativeData.description || "").slice(0, 150),
      linkUrl: creativeData.linkUrl || client.website_url || "",
      callToAction: creativeData.callToAction || "LEARN_MORE",
    };

    // Validate CTA
    const validCTAs = [
      "LEARN_MORE",
      "SHOP_NOW",
      "SIGN_UP",
      "BOOK_NOW",
      "CONTACT_US",
      "DOWNLOAD",
      "GET_QUOTE",
      "APPLY_NOW",
      "SUBSCRIBE",
      "WATCH_MORE",
      "SEND_MESSAGE",
      "GET_OFFER",
    ];
    if (!validCTAs.includes(result.callToAction)) {
      result.callToAction = "LEARN_MORE";
    }

    console.log("Generated creative data:", result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in generate-creative-texts:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
