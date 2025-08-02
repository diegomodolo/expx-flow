import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientData, clientAds, competitorData, competitorAds, analysisType } = await req.json();

    console.log('Analysis type:', analysisType);
    console.log('Generating competitive analysis...');

    if (analysisType === 'single_competitor') {
      // Análise focada em um único concorrente
      const competitor = competitorData[0];
      const ads = competitorAds;

      console.log('Single competitor analysis for:', competitor.name);
      console.log('Competitor ads:', ads.length);

      const adsSummary = ads.map((ad: any) => ({
        platform: ad.platform,
        type: ad.ad_type,
        title: ad.ad_title,
        copy: ad.ad_copy,
        cta: ad.call_to_action,
        estimated_performance: ad.estimated_performance,
        notes: ad.notes
      }));

      const singleCompetitorPrompt = `
Você é um especialista em análise competitiva digital. Analise profundamente este concorrente específico:

**CONCORRENTE ANALISADO:**
- Nome: ${competitor.name}
- Empresa: ${competitor.company_name}
- Setor: ${competitor.industry || 'Não especificado'}
- Website: ${competitor.website_url || 'Não informado'}
- Descrição: ${competitor.description || 'Não informada'}

**ANÚNCIOS MONITORADOS (${ads.length} anúncios):**
${adsSummary.map((ad, index) => `
${index + 1}. Plataforma: ${ad.platform}
   - Tipo: ${ad.type}
   - Título: ${ad.title || 'Não informado'}
   - Copy: ${ad.copy?.substring(0, 200) || 'Não informado'}...
   - CTA: ${ad.cta || 'Não informado'}
   - Performance Estimada: ${ad.estimated_performance}
   ${ad.notes ? `- Notas: ${ad.notes}` : ''}
`).join('\n')}

Retorne uma análise estruturada em formato JSON com os seguintes campos:

{
  "competitor_overview": "Análise geral do concorrente, posicionamento e estratégia observada",
  "messaging_strategy": "Análise das mensagens principais, tom de voz e abordagem de comunicação",
  "creative_patterns": "Padrões identificados nos criativos, tipos de anúncio preferidos e elementos visuais",
  "performance_indicators": "Análise dos indicadores de performance baseados nos anúncios observados",
  "strategic_opportunities": "Oportunidades estratégicas identificadas e gaps que podem ser explorados",
  "key_insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recomendação1", "recomendação2", "recomendação3"]
}

Seja específico e baseie-se apenas nos dados fornecidos. Se alguma informação não estiver disponível, mencione isso na análise.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'Você é um especialista em análise competitiva. Retorne sempre um JSON válido com a estrutura solicitada.' 
            },
            { role: 'user', content: singleCompetitorPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      // Try to parse as JSON
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch {
        // Fallback if not valid JSON
        analysis = {
          competitor_overview: analysisText,
          messaging_strategy: "Análise detalhada disponível na visão geral",
          creative_patterns: "Padrões identificados na análise principal",
          performance_indicators: "Métricas baseadas nos anúncios observados",
          strategic_opportunities: "Oportunidades detalhadas na análise principal",
          key_insights: ["Análise baseada em dados limitados"],
          recommendations: ["Consultar análise detalhada"]
        };
      }

      console.log('Generated single competitor analysis successfully');

      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Análise comparativa múltipla (código original)
    console.log('Multiple competitors analysis');
    console.log('Client ads:', clientAds?.length || 0, 'ads');
    console.log('Competitors:', competitorData?.length || 0, 'competitors');
    console.log('Competitor ads:', competitorAds?.length || 0, 'ads');

    // Preparar dados dos anúncios do cliente
    const clientAdsSummary = clientAds.map((ad: any) => ({
      name: ad.name,
      type: ad.creative_type,
      performance: {
        ctr: ad.ctr || 0,
        cpc: ad.cpc || 0,
        cpa: ad.cpa || 0,
        conversions: ad.conversions || 0,
        spend: ad.spend || 0
      },
      creative: {
        title: ad.creative_title,
        body: ad.creative_body,
        cta: ad.call_to_action
      }
    }));

    // Preparar dados dos concorrentes
    const competitorsSummary = competitorData.map((competitor: any) => ({
      name: competitor.name,
      company: competitor.company_name,
      industry: competitor.industry,
      platforms: [competitor.facebook_page_name, competitor.instagram_handle].filter(Boolean)
    }));

    // Preparar dados dos anúncios dos concorrentes
    const competitorAdsSummary = competitorAds.map((ad: any) => ({
      competitor: competitorData.find((c: any) => c.id === ad.competitor_id)?.name || 'Unknown',
      platform: ad.platform,
      type: ad.ad_type,
      title: ad.ad_title,
      copy: ad.ad_copy,
      cta: ad.call_to_action,
      estimated_performance: ad.estimated_performance,
      date_spotted: ad.date_spotted,
      notes: ad.notes
    }));

    const prompt = `
Você é um especialista sênior em análise competitiva de tráfego pago com mais de 10 anos de experiência em Meta Ads, Google Ads e inteligência de mercado.

Analise os dados do cliente "${clientData.name}" vs seus concorrentes e forneça insights estratégicos para superar a concorrência:

**DADOS DO CLIENTE:**
- Nome: ${clientData.name}
- Setor: ${clientData.sector}
- Produto: ${clientData.product_name || 'Não informado'}
- Tom de Voz: ${clientData.voice_tone || 'Não definido'}

**ANÚNCIOS DO CLIENTE:**
${clientAdsSummary.map((ad, index) => `
${index + 1}. ${ad.name}
   - Tipo: ${ad.type}
   - CTR: ${ad.performance.ctr.toFixed(2)}%
   - CPC: R$ ${ad.performance.cpc.toFixed(2)}
   - CPA: R$ ${ad.performance.cpa.toFixed(2)}
   - Título: ${ad.creative.title}
   - Copy: ${ad.creative.body?.substring(0, 100)}...
`).join('\n')}

**CONCORRENTES IDENTIFICADOS:**
${competitorsSummary.map((comp, index) => `
${index + 1}. ${comp.name} (${comp.company})
   - Setor: ${comp.industry}
   - Plataformas: ${comp.platforms.join(', ')}
`).join('\n')}

**ANÚNCIOS DOS CONCORRENTES:**
${competitorAdsSummary.map((ad, index) => `
${index + 1}. Concorrente: ${ad.competitor}
   - Plataforma: ${ad.platform}
   - Tipo: ${ad.type}
   - Título: ${ad.title}
   - Copy: ${ad.copy?.substring(0, 150)}...
   - CTA: ${ad.cta}
   - Performance Estimada: ${ad.estimated_performance}
   - Observado em: ${ad.date_spotted}
`).join('\n')}

**FORNEÇA UMA ANÁLISE COMPETITIVA DETALHADA EM MARKDOWN:**

## 🎯 Análise Competitiva Geral
Avalie o posicionamento do cliente vs concorrentes e principais gaps identificados.

## 📊 Benchmark de Performance
Compare as métricas do cliente com padrões observados nos concorrentes.

## 🎨 Análise de Criativos
Para cada concorrente principal, analise:
- Estratégias de copy mais efetivas
- Padrões de design e elementos visuais
- CTAs mais utilizados
- Ofertas e propostas de valor

## 🚀 Oportunidades Competitivas
Identifique lacunas e oportunidades baseadas na análise:
- Nichos não explorados pelos concorrentes
- Mensagens que podem ser melhoradas
- Estratégias de diferenciação

## ⚡ Recomendações Táticas
Liste 5-7 ações específicas para superar a concorrência:
- Otimizações de copy baseadas nos melhores performers
- Estratégias de lançamento inspiradas nos concorrentes
- Diferenciações competitivas

## 🎯 Estratégia Anti-Competitiva
Sugira táticas específicas para:
- Neutralizar vantagens dos concorrentes
- Explorar fraquezas identificadas
- Posicionar o cliente como líder

Seja específico, tactical e baseie-se em dados. Use frameworks comprovados como:
- Análise SWOT competitiva
- Blue Ocean Strategy
- Posicionamento competitivo
- Growth hacking anti-concorrência

Formate em markdown para melhor legibilidade.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em análise competitiva de tráfego pago e inteligência de mercado digital. Seja específico, tático e baseado em dados reais observados.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('Generated competitive analysis successfully');

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-competitor-insights function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});