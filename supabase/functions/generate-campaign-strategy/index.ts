import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando geração de estratégia de campanha');
    
    const { client, funnelStage, campaignType, step } = await req.json();
    
    if (!client) {
      throw new Error('Cliente é obrigatório');
    }

    console.log(`Processando ${step} para cliente ${client.name} - ${funnelStage} - ${campaignType}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar histórico de campanhas do cliente
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Erro ao buscar campanhas:', campaignsError);
    }

    // Buscar anúncios históricos para análise de criativos
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (adsError) {
      console.error('Erro ao buscar anúncios:', adsError);
    }

    let prompt = '';
    
    if (step === 'campaign_type_suggestion') {
      prompt = `
        Como especialista em marketing digital, analise o cliente e sugira os melhores tipos de campanha.

        **CLIENTE:**
        - Nome: ${client.name}
        - Setor: ${client.sector}
        - Orçamento Mensal: R$ ${client.monthly_budget || 'Não informado'}
        - Público-Alvo: ${client.target_audience || 'Não informado'}
        - Objetivos: ${client.objectives || 'Não informado'}
        - Tom de Voz: ${client.voice_tone || 'Profissional'}

        **HISTÓRICO DE PERFORMANCE:**
        ${campaigns?.length ? campaigns.map(c => 
          `- ${c.name}: CPA R$ ${c.cpa}, CTR ${c.ctr}%, ${c.conversions} conversões`
        ).join('\n') : 'Nenhum histórico disponível'}

        **ETAPA DO FUNIL:** ${funnelStage}

        Com base no histórico e na etapa "${funnelStage}", forneça 3-4 sugestões específicas de por que cada tipo de campanha seria adequado para este cliente. Seja conciso e estratégico.

        Responda em formato JSON:
        {
          "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"]
        }
      `;
    } else if (step === 'campaign_configuration') {
      prompt = `
        Como especialista em Facebook Ads, crie uma configuração otimizada de campanha.

        **CLIENTE:**
        - Nome: ${client.name}
        - Setor: ${client.sector}
        - Orçamento Mensal: R$ ${client.monthly_budget || 5000}
        - Público-Alvo: ${client.target_audience || 'Não informado'}
        - Objetivos: ${client.objectives || 'Não informado'}

        **HISTÓRICO DE PERFORMANCE:**
        ${campaigns?.length ? campaigns.map(c => 
          `- ${c.name}: Gasto R$ ${c.spend}, CPA R$ ${c.cpa}, CTR ${c.ctr}%, ${c.conversions} conversões, ${c.impressions} impressões`
        ).join('\n') : 'Primeiro cliente - usar benchmarks do setor'}

        **PARÂMETROS:**
        - Etapa do Funil: ${funnelStage}
        - Tipo de Campanha: ${campaignType}

        Com base no histórico (ou benchmarks se for o primeiro), calcule:

        1. **Orçamento otimizado** (diário e total baseado no histórico de performance)
        2. **Segmentação detalhada** (demografia, interesses, comportamentos específicos do setor)
        3. **Estratégia de lance** (baseada no CPA histórico ou benchmark)
        4. **Cronograma estratégico** (duração, horários, dias da semana)
        5. **Estrutura de conjuntos de anúncios** (quantidade e variações)

        Responda em formato JSON detalhado:
        {
          "budget": {
            "daily": 100,
            "total": 3000,
            "duration": 30,
            "distribution": "Descrição da estratégia de distribuição"
          },
          "targeting": {
            "demographics": "Idade, gênero, localização específica",
            "interests": ["interesse1", "interesse2", "interesse3"],
            "behaviors": "Comportamentos de compra específicos",
            "estimatedReach": "50.000-80.000"
          },
          "bidding": {
            "strategy": "Estratégia de lance otimizada",
            "targetCPA": 50
          },
          "schedule": {
            "duration": 30,
            "startDate": "2024-01-15",
            "endDate": "2024-02-14",
            "optimalHours": "18h-22h durante a semana, 10h-14h finais de semana"
          },
          "adSets": [
            {"name": "Conjunto 1", "budget": 30, "targeting": "Segmentação específica"},
            {"name": "Conjunto 2", "budget": 40, "targeting": "Segmentação específica"},
            {"name": "Conjunto 3", "budget": 30, "targeting": "Segmentação específica"}
          ],
          "recommendations": [
            "Recomendação estratégica 1",
            "Recomendação estratégica 2",
            "Recomendação estratégica 3"
          ]
        }
      `;
    }

    console.log('Enviando prompt para OpenAI');

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
            content: 'Você é um especialista em marketing digital e Facebook Ads com 10+ anos de experiência. Analise dados históricos e gere estratégias otimizadas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('Resposta da OpenAI recebida');

    const content = aiResponse.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      console.log('Conteúdo parseado com sucesso');
      
      if (step === 'campaign_type_suggestion') {
        return new Response(JSON.stringify({
          success: true,
          suggestions: parsedContent.suggestions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (step === 'campaign_configuration') {
        return new Response(JSON.stringify({
          success: true,
          configuration: parsedContent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      console.log('Conteúdo recebido:', content);
      
      // Fallback para resposta em texto
      return new Response(JSON.stringify({
        success: true,
        [step === 'campaign_type_suggestion' ? 'suggestions' : 'configuration']: content
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});