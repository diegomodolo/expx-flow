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
    console.log('Iniciando geração de criativos de campanha');
    
    const { client, funnelStage, campaignType, configuration } = await req.json();
    
    if (!client || !configuration) {
      throw new Error('Cliente e configuração são obrigatórios');
    }

    console.log(`Gerando criativos para ${client.name} - ${funnelStage} - ${campaignType}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar criativos históricos de sucesso
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_id', client.id)
      .gt('ctr', 1.0) // CTR acima de 1%
      .order('ctr', { ascending: false })
      .limit(10);

    if (adsError) {
      console.error('Erro ao buscar anúncios:', adsError);
    }

    const bestPerformingAds = ads?.filter(ad => ad.conversions > 0) || [];

    const prompt = `
      Como copywriter especialista em Facebook Ads, crie criativos de alta conversão.

      **CLIENTE:**
      - Nome: ${client.name}
      - Setor: ${client.sector}
      - Público-Alvo: ${client.target_audience || 'Não informado'}
      - Objetivos: ${client.objectives || 'Não informado'}
      - Tom de Voz: ${client.voice_tone || 'Profissional'}
      - Produto/Serviço: ${client.product_name || client.name}

      **CAMPANHA:**
      - Etapa do Funil: ${funnelStage}
      - Tipo: ${campaignType}
      - Conjuntos de Anúncios: ${configuration.adSets?.length || 3}

      **CRIATIVOS DE MELHOR PERFORMANCE (para referência):**
      ${bestPerformingAds.length > 0 ? bestPerformingAds.map(ad => 
        `- Título: "${ad.creative_title}" | Texto: "${ad.creative_body}" | CTR: ${ad.ctr}% | Conversões: ${ad.conversions}`
      ).join('\n') : 'Nenhum histórico disponível - criar baseado nas melhores práticas do setor'}

      **INSTRUÇÕES:**
      1. Crie ${configuration.adSets?.length || 3} conjuntos de criativos únicos
      2. Para cada conjunto, gere 1 criativo principal + 2 variações para teste A/B
      3. Mantenha o tom de voz do cliente: ${client.voice_tone || 'Profissional'}
      4. Foque na etapa "${funnelStage}" do funil
      5. Use elementos dos criativos de sucesso como inspiração (se houver)

      **FORMATO DE CADA CRIATIVO:**
      - Título (máx 27 caracteres, impactante)
      - Texto Principal (máx 125 caracteres, persuasivo)
      - Descrição (máx 27 caracteres, complementar)
      - Call to Action (específico para a etapa do funil)
      - Sugestão de Imagem (descrição detalhada)
      - Sugestão de Vídeo (se aplicável)

      Responda em formato JSON:
      {
        "creatives": [
          {
            "id": "creative_1",
            "adSetName": "Nome do Conjunto 1",
            "headline": "Título principal",
            "primaryText": "Texto principal do anúncio",
            "description": "Descrição complementar",
            "callToAction": "CTA específico",
            "imageDescription": "Descrição detalhada da imagem sugerida",
            "videoSuggestion": "Descrição do vídeo (opcional)",
            "variations": {
              "headline": ["Variação 1", "Variação 2"],
              "primaryText": ["Variação 1", "Variação 2"],
              "description": ["Variação 1", "Variação 2"]
            }
          }
        ]
      }
    `;

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
            content: 'Você é um copywriter especialista em Facebook Ads com foco em alta conversão. Crie criativos persuasivos baseados em dados de performance histórica.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000,
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
      console.log('Criativos gerados com sucesso:', parsedContent.creatives?.length);
      
      return new Response(JSON.stringify({
        success: true,
        creatives: parsedContent.creatives
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      console.log('Conteúdo recebido:', content);
      
      // Fallback: criar estrutura básica
      const fallbackCreatives = Array.from({ length: configuration.adSets?.length || 3 }, (_, i) => ({
        id: `creative_${i + 1}`,
        adSetName: `Conjunto ${i + 1}`,
        headline: `${client.name} - Oferta Especial`,
        primaryText: `Descubra como ${client.name} pode transformar seus resultados. Soluções personalizadas para ${client.sector}.`,
        description: 'Saiba mais agora',
        callToAction: 'Saiba Mais',
        imageDescription: `Imagem profissional relacionada a ${client.sector} com cores vibrantes`,
        variations: {
          headline: [`${client.name} - Nova Oportunidade`, `Transforme seus Resultados`],
          primaryText: [`Soluções inovadoras em ${client.sector}`, `Resultados comprovados para seu negócio`],
          description: ['Conheça agora', 'Descubra mais']
        }
      }));
      
      return new Response(JSON.stringify({
        success: true,
        creatives: fallbackCreatives
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