import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignData {
  name: string;
  client_name: string;
  cpa: number;
  ctr: number;
  conversions: number;
  spend: number;
  impressions: number;
  clicks: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const { campaign, issue_type }: { campaign: CampaignData, issue_type: string } = requestBody;

    // Validação robusta dos dados de entrada
    if (!campaign) {
      console.error('Campaign data is missing');
      throw new Error('Campaign data is required');
    }

    if (!issue_type) {
      console.error('Issue type is missing');
      throw new Error('Issue type is required');
    }

    // Validar campos obrigatórios da campanha
    const requiredFields = ['name', 'client_name'];
    for (const field of requiredFields) {
      if (!campaign[field]) {
        console.error(`Campaign field '${field}' is missing`);
        throw new Error(`Campaign field '${field}' is required`);
      }
    }

    // Garantir valores numéricos válidos
    const numericFields = ['cpa', 'ctr', 'conversions', 'spend', 'impressions', 'clicks'];
    for (const field of numericFields) {
      if (campaign[field] === undefined || campaign[field] === null || isNaN(Number(campaign[field]))) {
        console.warn(`Campaign field '${field}' is invalid, using 0`);
        campaign[field] = 0;
      }
    }

    console.log('Validated campaign data:', JSON.stringify(campaign, null, 2));
    console.log('Issue type:', issue_type);

    // Prepare context-specific prompt based on issue type
    let systemPrompt = '';
    let userPrompt = '';

    if (issue_type === 'high_cpa') {
      systemPrompt = `Você é um especialista em marketing digital especializado em otimização de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas e acionáveis para reduzir o CPA.`;
      
      userPrompt = `
Analise esta campanha com CPA alto:

🏢 Cliente: ${campaign.client_name}
📋 Campanha: ${campaign.name}
💰 CPA Atual: R$ ${campaign.cpa.toFixed(2)}
📊 CTR: ${campaign.ctr.toFixed(2)}%
🎯 Conversões: ${campaign.conversions}
💸 Gasto: R$ ${campaign.spend.toFixed(2)}
👁️ Impressões: ${(campaign.impressions || 0).toLocaleString()}
🖱️ Cliques: ${campaign.clicks || 0}

Forneça UMA recomendação específica e acionável em no máximo 6 palavras para reduzir o CPA. 
Seja direto e prático. Exemplos: "Revisar audiência e testar novos criativos", "Pausar públicos com baixa performance", "Otimizar copy e call-to-action".

Responda APENAS com a recomendação, sem explicações adicionais.`;

    } else if (issue_type === 'low_ctr') {
      systemPrompt = `Você é um especialista em marketing digital especializado em otimização de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas e acionáveis para aumentar o CTR.`;
      
      userPrompt = `
Analise esta campanha com CTR baixo:

🏢 Cliente: ${campaign.client_name}
📋 Campanha: ${campaign.name}
📊 CTR Atual: ${campaign.ctr.toFixed(2)}%
💰 CPA: R$ ${campaign.cpa.toFixed(2)}
🎯 Conversões: ${campaign.conversions}
💸 Gasto: R$ ${campaign.spend.toFixed(2)}
👁️ Impressões: ${(campaign.impressions || 0).toLocaleString()}
🖱️ Cliques: ${campaign.clicks || 0}

Forneça UMA recomendação específica e acionável em no máximo 6 palavras para aumentar o CTR. 
Seja direto e prático. Exemplos: "Criar criativos mais impactantes e urgentes", "Testar headlines com maior apelo", "Renovar imagens e vídeos dos anúncios".

Responda APENAS com a recomendação, sem explicações adicionais.`;

    } else if (issue_type === 'scale_opportunity') {
      systemPrompt = `Você é um especialista em marketing digital especializado em escalonamento de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas para escalar com segurança.`;
      
      userPrompt = `
Analise esta oportunidade de escalonamento:

🏢 Cliente: ${campaign.client_name}
📋 Campanha: ${campaign.name}
💰 CPA Baixo: R$ ${campaign.cpa.toFixed(2)}
📊 CTR: ${campaign.ctr.toFixed(2)}%
🎯 Conversões: ${campaign.conversions}
💸 Gasto: R$ ${campaign.spend.toFixed(2)}
👁️ Impressões: ${(campaign.impressions || 0).toLocaleString()}
🖱️ Cliques: ${campaign.clicks || 0}

Forneça UMA recomendação específica e acionável em no máximo 6 palavras para escalar esta campanha. 
Seja direto e prático. Exemplos: "Aumentar budget 20% por 3 dias", "Duplicar campanha com audiências similares", "Expandir para públicos lookalike 1-2%".

Responda APENAS com a recomendação, sem explicações adicionais.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices[0].message.content.trim();

    console.log('Generated recommendation:', recommendation);

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-campaign-recommendation function:', error);
    
    // Retorna sempre 200 com recomendação de fallback para evitar quebrar a UI
    const fallbackRecommendations = {
      'high_cpa': 'Revisar segmentação e otimizar palavras-chave',
      'low_ctr': 'Testar novos criativos e headlines',
      'scale_opportunity': 'Aumentar budget gradualmente e monitorar',
      'default': 'Analisar métricas e otimizar campanha'
    };

    const fallbackRecommendation = fallbackRecommendations[issue_type] || fallbackRecommendations['default'];
    
    return new Response(JSON.stringify({ 
      recommendation: fallbackRecommendation,
      isFallback: true
    }), {
      status: 200, // Sempre retorna 200 para não quebrar a UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});