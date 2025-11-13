// Deno.serve is available natively in modern Deno

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientData, campaigns } = await req.json();

    console.log('Generating analysis for client:', clientData.name);
    console.log('Campaigns data:', campaigns?.length || 0, 'campaigns');

    // Preparar dados das campanhas para análise
    const campaignSummary = campaigns.map((campaign: any) => ({
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      spend: campaign.spend || 0,
      conversions: campaign.conversions || 0,
      cpa: campaign.cpa || 0,
      ctr: campaign.ctr || 0,
      cpc: campaign.cpc || 0,
      reach: campaign.reach || 0,
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
    }));

    const totalSpend = campaignSummary.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = campaignSummary.reduce((sum, c) => sum + c.conversions, 0);
    const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const activeCampaigns = campaignSummary.filter(c => c.status === 'active').length;

    const prompt = `
Você é um especialista sênior em tráfego pago e marketing digital com mais de 10 anos de experiência em Meta Ads, Google Ads e estratégias de growth.

Analise os dados do cliente "${clientData.name}" do setor "${clientData.sector}" e forneça uma análise completa e estratégica:

**DADOS DO CLIENTE:**
- Nome: ${clientData.name}
- Setor: ${clientData.sector}
- Produto: ${clientData.product_name || 'Não informado'}
- Orçamento Mensal: R$ ${clientData.monthly_budget || 'Não definido'}
- Leads Gerados: ${clientData.leads_generated || 0}
- Status Atual: ${clientData.status}

**RESUMO DAS CAMPANHAS:**
- Total de Campanhas: ${campaigns.length}
- Campanhas Ativas: ${activeCampaigns}
- Investimento Total: R$ ${totalSpend.toFixed(2)}
- Total de Conversões: ${totalConversions}
- CPA Médio: R$ ${averageCPA.toFixed(2)}

**DETALHES DAS CAMPANHAS:**
${campaignSummary.map((campaign, index) => `
${index + 1}. ${campaign.name}
   - Status: ${campaign.status}
   - Objetivo: ${campaign.objective}
   - Investimento: R$ ${campaign.spend.toFixed(2)}
   - Conversões: ${campaign.conversions}
   - CPA: R$ ${campaign.cpa.toFixed(2)}
   - CTR: ${campaign.ctr.toFixed(2)}%
   - CPC: R$ ${campaign.cpc.toFixed(2)}
   - Alcance: ${campaign.reach.toLocaleString()}
`).join('\n')}

**FORNEÇA UMA ANÁLISE DETALHADA EM FORMATO MARKDOWN COM:**

## 🎯 Diagnóstico Geral
Avalie o desempenho geral da conta e principais problemas identificados.

## 📊 Análise por Campanha
Para cada campanha ativa, forneça insights específicos sobre:
- Performance atual
- Pontos de otimização
- Recomendações táticas

## 🚀 Estratégias de Escala
Baseado nas melhores práticas de tráfego pago:
- Oportunidades de crescimento
- Estratégias de diversificação
- Estrutura de campanhas otimizada

## ⚡ Ações Prioritárias
Liste 5-7 ações concretas em ordem de prioridade para os próximos 30 dias.

## 📈 Projeções e Metas
Estabeleça metas realistas baseadas nos dados históricos e potencial do setor.

Seja específico, actionable e use termos técnicos apropriados. Baseie-se em frameworks comprovados como:
- Estrutura de funil AIDA/TOFU-MOFU-BOFU
- Metodologias de CRO
- Estratégias de bidding e otimização de Meta
- Técnicas de segmentação avançada
- Growth loops e LTV:CAC

Formate em markdown para melhor legibilidade.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em tráfego pago e marketing digital com vasta experiência em Meta Ads, Google Ads e growth marketing. Seja detalhado, técnico e estratégico em suas análises.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('Generated analysis successfully');

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-campaign-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});