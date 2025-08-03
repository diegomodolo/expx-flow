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

        CRÍTICO: Retorne APENAS um JSON válido, sem markdown ou explicações.
        
        Baseado no histórico de performance (ou benchmarks do setor), calcule valores específicos e crie uma configuração otimizada:

        1. **Orçamento**: Baseado no orçamento mensal de R$ ${client.monthly_budget || 5000}
        2. **Segmentação**: Específica para o setor ${client.sector}
        3. **CPA Alvo**: ${campaigns?.length ? 'Baseado no CPA histórico médio' : 'Usar benchmark do setor'}
        4. **Cronograma**: Otimizado para o público-alvo

        JSON obrigatório (sem markdown):
        {
          "budget": {
            "daily": ${client.monthly_budget ? Math.round(client.monthly_budget / 30) : 167},
            "total": ${client.monthly_budget || 5000},
            "duration": 30,
            "distribution": "Estratégia detalhada de distribuição"
          },
          "targeting": {
            "demographics": "Idade específica, gênero, localização",
            "interests": ["interesse1", "interesse2", "interesse3"],
            "behaviors": "Comportamentos específicos",
            "estimatedReach": "XX.XXX-XX.XXX"
          },
          "bidding": {
            "strategy": "Estratégia otimizada",
            "targetCPA": ${campaigns?.length ? Math.round(campaigns.reduce((sum, c) => sum + (c.cpa || 0), 0) / campaigns.length) || 45 : 45}
          },
          "schedule": {
            "duration": 30,
            "startDate": "2025-01-03",
            "endDate": "2025-02-02",
            "optimalHours": "Horários específicos"
          },
          "adSets": [
            {"name": "Nome 1", "budget": ${Math.round((client.monthly_budget || 5000) * 0.5 / 30)}, "targeting": "Segmentação 1"},
            {"name": "Nome 2", "budget": ${Math.round((client.monthly_budget || 5000) * 0.3 / 30)}, "targeting": "Segmentação 2"},
            {"name": "Nome 3", "budget": ${Math.round((client.monthly_budget || 5000) * 0.2 / 30)}, "targeting": "Segmentação 3"}
          ],
          "recommendations": [
            "Recomendação 1",
            "Recomendação 2", 
            "Recomendação 3",
            "Recomendação 4"
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
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedContent = JSON.parse(cleanContent);
      console.log('Conteúdo parseado com sucesso');
      
      if (step === 'campaign_type_suggestion') {
        return new Response(JSON.stringify({
          success: true,
          suggestions: parsedContent.suggestions || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (step === 'campaign_configuration') {
        // Calcular CPA histórico médio
        const historicalCPA = campaigns?.length 
          ? campaigns.reduce((sum, c) => sum + (c.cpa || 0), 0) / campaigns.length 
          : 0;

        // Validar e aplicar fallbacks para configuração da campanha
        const validatedConfig = {
          budget: parsedContent.budget || {
            daily: client.monthly_budget ? Math.round(client.monthly_budget / 30) : 100,
            total: client.monthly_budget || 3000,
            duration: 30,
            distribution: "Distribuição equilibrada entre conjuntos de anúncios para otimização de performance"
          },
          targeting: parsedContent.targeting || {
            demographics: `Idade: 25-45, ambos os gêneros, localização: Brasil`,
            interests: ["Marketing Digital", "Negócios", "Empreendedorismo"],
            behaviors: "Pessoas interessadas em produtos/serviços similares",
            estimatedReach: "10.000-25.000"
          },
          bidding: parsedContent.bidding || {
            strategy: "Otimização para conversões com lance automático",
            targetCPA: historicalCPA > 0 ? Math.round(historicalCPA) : 50
          },
          schedule: parsedContent.schedule || {
            duration: 30,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            optimalHours: "8h-22h (segunda a sexta); 10h-20h (finais de semana)"
          },
          adSets: parsedContent.adSets || [
            {
              name: "Público Principal",
              budget: Math.round((client.monthly_budget || 3000) * 0.6 / 30),
              targeting: "Segmentação principal baseada no público-alvo do cliente"
            },
            {
              name: "Lookalike",
              budget: Math.round((client.monthly_budget || 3000) * 0.25 / 30),
              targeting: "Público semelhante aos melhores clientes"
            },
            {
              name: "Retargeting",
              budget: Math.round((client.monthly_budget || 3000) * 0.15 / 30),
              targeting: "Pessoas que já interagiram com a marca"
            }
          ],
          recommendations: parsedContent.recommendations || [
            "Monitorar performance diariamente nos primeiros 7 dias",
            "Ajustar orçamentos baseado no CPA dos conjuntos de anúncios",
            "Testar diferentes criativos para otimizar CTR",
            "Implementar tracking de conversões adequado"
          ]
        };

        return new Response(JSON.stringify({
          success: true,
          configuration: validatedConfig
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      console.log('Conteúdo recebido:', content);
      
      // Fallback completo com dados padrão
      if (step === 'campaign_configuration') {
        const historicalCPA = campaigns?.length 
          ? campaigns.reduce((sum, c) => sum + (c.cpa || 0), 0) / campaigns.length 
          : 0;

        const fallbackConfig = {
          budget: {
            daily: client.monthly_budget ? Math.round(client.monthly_budget / 30) : 100,
            total: client.monthly_budget || 3000,
            duration: 30,
            distribution: "Distribuição equilibrada entre conjuntos de anúncios para otimização de performance"
          },
          targeting: {
            demographics: `Idade: 25-45, ambos os gêneros, localização: Brasil`,
            interests: ["Marketing Digital", "Negócios", "Empreendedorismo"],
            behaviors: "Pessoas interessadas em produtos/serviços similares",
            estimatedReach: "10.000-25.000"
          },
          bidding: {
            strategy: "Otimização para conversões com lance automático",
            targetCPA: historicalCPA > 0 ? Math.round(historicalCPA) : 50
          },
          schedule: {
            duration: 30,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            optimalHours: "8h-22h (segunda a sexta); 10h-20h (finais de semana)"
          },
          adSets: [
            {
              name: "Público Principal",
              budget: Math.round((client.monthly_budget || 3000) * 0.6 / 30),
              targeting: "Segmentação principal baseada no público-alvo do cliente"
            },
            {
              name: "Lookalike",
              budget: Math.round((client.monthly_budget || 3000) * 0.25 / 30),
              targeting: "Público semelhante aos melhores clientes"
            },
            {
              name: "Retargeting",
              budget: Math.round((client.monthly_budget || 3000) * 0.15 / 30),
              targeting: "Pessoas que já interagiram com a marca"
            }
          ],
          recommendations: [
            "Monitorar performance diariamente nos primeiros 7 dias",
            "Ajustar orçamentos baseado no CPA dos conjuntos de anúncios",
            "Testar diferentes criativos para otimizar CTR",
            "Implementar tracking de conversões adequado"
          ]
        };

        return new Response(JSON.stringify({
          success: true,
          configuration: fallbackConfig
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Fallback para sugestões
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