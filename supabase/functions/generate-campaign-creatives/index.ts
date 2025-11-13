import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
      Como copywriter especialista em Facebook Ads, crie criativos de alta conversão baseados no briefing completo do cliente.

      **CLIENTE:**
      - Nome: ${client.name}
      - Setor: ${client.sector}
      - Público-Alvo: ${client.target_audience || 'Não informado'}
      - Objetivos: ${client.objectives || 'Não informado'}
      - Tom de Voz: ${client.voice_tone || 'Profissional'}
      - Produto/Serviço: ${client.product_name || client.name}
      - Website: ${client.website_url || 'Não informado'}

      **BRIEFING COMPLETO DO CLIENTE:**
      ${client.ai_briefing || 'Briefing não disponível - use as informações básicas do cliente para criar criativos genéricos relevantes ao setor'}

      **CAMPANHA:**
      - Etapa do Funil: ${funnelStage}
      - Tipo: ${campaignType}
      - Configuração: ${JSON.stringify(configuration, null, 2)}

      **CRIATIVOS DE MELHOR PERFORMANCE (para referência):**
      ${bestPerformingAds.length > 0 ? bestPerformingAds.map(ad => 
        `- Título: "${ad.creative_title}" | Texto: "${ad.creative_body}" | CTR: ${ad.ctr}% | Conversões: ${ad.conversions}`
      ).join('\n') : 'Nenhum histórico disponível - criar baseado nas melhores práticas do setor e briefing do cliente'}

      **INSTRUÇÕES CRÍTICAS:**
      1. LEIA E ANALISE TODO O BRIEFING DO CLIENTE antes de criar qualquer criativo
      2. Use as dores, necessidades e linguagem específicas mencionadas no briefing
      3. Incorpore os argumentos de venda e benefícios principais do briefing
      4. Respeite o tom de voz e diretrizes criativas do briefing
      5. Foque na etapa "${funnelStage}" do funil conforme estratégia do briefing
      6. Crie ${configuration.adSets?.length || 3} conjuntos de criativos únicos
      7. Para cada conjunto, gere 1 criativo principal + 2 variações para teste A/B
      8. Use elementos dos criativos de sucesso como inspiração (se houver)

      **FORMATO DE CADA CRIATIVO:**
      - Título (máx 27 caracteres, impactante, baseado no briefing)
      - Texto Principal (máx 125 caracteres, persuasivo, com dores/benefícios do briefing)
      - Descrição (máx 27 caracteres, complementar)
      - Call to Action (específico para a etapa do funil e produto do cliente)
      - Sugestão de Imagem (descrição detalhada baseada no produto/serviço)
      - Sugestão de Vídeo (se aplicável, baseado na natureza do produto)

      **IMPORTANTE:** Os criativos DEVEM refletir exatamente o produto/serviço descrito no briefing, suas dores específicas, benefícios únicos e linguagem apropriada. NÃO crie criativos genéricos!

      Responda em formato JSON sem markdown:
      {
        "creatives": [
          {
            "id": "creative_1",
            "adSetName": "Nome do Conjunto 1 (baseado na segmentação do briefing)",
            "headline": "Título principal (específico do produto)",
            "primaryText": "Texto principal (com dores/benefícios do briefing)",
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
      }`;

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
            content: 'Você é um copywriter especialista em Facebook Ads que analisa briefings detalhados de clientes para criar criativos precisos e altamente relevantes. SEMPRE leia todo o briefing fornecido e crie criativos específicos para o produto/serviço descrito, nunca criativos genéricos.'
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
      // Limpar markdown se presente
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedContent = JSON.parse(cleanContent);
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
      
      // Fallback: criar estrutura básica baseada no briefing
      const productKeywords = client.ai_briefing ? 
        (client.ai_briefing.toLowerCase().includes('delivery') ? 'delivery' :
         client.ai_briefing.toLowerCase().includes('nota fiscal') ? 'automação fiscal' :
         client.sector) : client.sector;
         
      const fallbackCreatives = Array.from({ length: configuration.adSets?.length || 3 }, (_, i) => ({
        id: `creative_${i + 1}`,
        adSetName: `Conjunto ${i + 1} - ${productKeywords}`,
        headline: client.ai_briefing?.includes('1 clique') ? 'Nota em 1 Clique' : `${client.name} - Solução`,
        primaryText: client.ai_briefing?.includes('retrabalho') ? 
          'Pare de perder tempo com retrabalho. Automatize suas notas fiscais.' :
          `Descubra como ${client.name} pode transformar seus resultados em ${client.sector}.`,
        description: 'Experimente grátis',
        callToAction: client.ai_briefing?.includes('teste') ? 'Teste Grátis' : 'Saiba Mais',
        imageDescription: `Imagem de ${productKeywords} com interface moderna e resultados visuais`,
        variations: {
          headline: [`${client.name} Oficial`, `Automatize Agora`],
          primaryText: [`Solução homologada para ${productKeywords}`, `Economize tempo e reduza erros`],
          description: ['Comece hoje', 'Veja como']
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