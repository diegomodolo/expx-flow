import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  issue_type: 'high_cpa' | 'low_ctr' | 'scale_opportunity';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { campaignData }: { campaignData: CampaignData } = await req.json();

    console.log('Generating recommendation for campaign:', campaignData.name);

    // Prepare context-specific prompt based on issue type
    let systemPrompt = '';
    let userPrompt = '';

    if (campaignData.issue_type === 'high_cpa') {
      systemPrompt = `Você é um especialista em marketing digital especializado em otimização de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas e acionáveis para reduzir o CPA.`;
      
      userPrompt = `
Analise esta campanha com CPA alto:

🏢 Cliente: ${campaignData.client_name}
📋 Campanha: ${campaignData.name}
💰 CPA Atual: R$ ${campaignData.cpa.toFixed(2)}
📊 CTR: ${campaignData.ctr.toFixed(2)}%
🎯 Conversões: ${campaignData.conversions}
💸 Gasto: R$ ${campaignData.spend.toFixed(2)}
👁️ Impressões: ${campaignData.impressions.toLocaleString()}
🖱️ Cliques: ${campaignData.clicks}

Forneça UMA recomendação específica e acionável em no máximo 6 palavras para reduzir o CPA. 
Seja direto e prático. Exemplos: "Revisar audiência e testar novos criativos", "Pausar públicos com baixa performance", "Otimizar copy e call-to-action".

Responda APENAS com a recomendação, sem explicações adicionais.`;

    } else if (campaignData.issue_type === 'low_ctr') {
      systemPrompt = `Você é um especialista em marketing digital especializado em otimização de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas e acionáveis para aumentar o CTR.`;
      
      userPrompt = `
Analise esta campanha com CTR baixo:

🏢 Cliente: ${campaignData.client_name}
📋 Campanha: ${campaignData.name}
📊 CTR Atual: ${campaignData.ctr.toFixed(2)}%
💰 CPA: R$ ${campaignData.cpa.toFixed(2)}
🎯 Conversões: ${campaignData.conversions}
💸 Gasto: R$ ${campaignData.spend.toFixed(2)}
👁️ Impressões: ${campaignData.impressions.toLocaleString()}
🖱️ Cliques: ${campaignData.clicks}

Forneça UMA recomendação específica e acionável em no máximo 6 palavras para aumentar o CTR. 
Seja direto e prático. Exemplos: "Criar criativos mais impactantes e urgentes", "Testar headlines com maior apelo", "Renovar imagens e vídeos dos anúncios".

Responda APENAS com a recomendação, sem explicações adicionais.`;

    } else if (campaignData.issue_type === 'scale_opportunity') {
      systemPrompt = `Você é um especialista em marketing digital especializado em escalonamento de campanhas de Facebook/Meta Ads. 
      Sua tarefa é analisar dados de campanha e fornecer recomendações específicas para escalar com segurança.`;
      
      userPrompt = `
Analise esta oportunidade de escalonamento:

🏢 Cliente: ${campaignData.client_name}
📋 Campanha: ${campaignData.name}
💰 CPA Baixo: R$ ${campaignData.cpa.toFixed(2)}
📊 CTR: ${campaignData.ctr.toFixed(2)}%
🎯 Conversões: ${campaignData.conversions}
💸 Gasto: R$ ${campaignData.spend.toFixed(2)}
👁️ Impressões: ${campaignData.impressions.toLocaleString()}
🖱️ Cliques: ${campaignData.clicks}

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
        model: 'gpt-4.1-2025-04-14',
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
    return new Response(JSON.stringify({ 
      error: error.message,
      recommendation: 'Analisar métricas e otimizar campanha' // Fallback
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});