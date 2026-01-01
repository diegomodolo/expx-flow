// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
        Como especialista em marketing digital, analise detalhadamente o cliente e sugira os melhores tipos de campanha.

        **CLIENTE:**
        - Nome: ${client.name}
        - Setor: ${client.sector}
        - Orçamento Mensal: R$ ${client.monthly_budget || 'Não informado'}
        - Público-Alvo: ${client.target_audience || 'Não informado'}
        - Objetivos: ${client.objectives || 'Não informado'}
        - Tom de Voz: ${client.voice_tone || 'Profissional'}

        ${client.ai_briefing ? `
        **BRIEFING DETALHADO DO CLIENTE:**
        ${client.ai_briefing}

        **IMPORTANTE:** Use as informações específicas do briefing acima para criar sugestões altamente relevantes e personalizadas. Não use segmentações genéricas.
        ` : ''}

        **HISTÓRICO DE PERFORMANCE:**
        ${campaigns?.length ? campaigns.map(c => 
          `- ${c.name}: CPA R$ ${c.cpa}, CTR ${c.ctr}%, ${c.conversions} conversões`
        ).join('\n') : 'Nenhum histórico disponível'}

        **ETAPA DO FUNIL:** ${funnelStage}

        Com base no briefing detalhado e na etapa "${funnelStage}", forneça 3-4 sugestões específicas de por que cada tipo de campanha seria adequado para este cliente. Seja conciso e estratégico.

        Responda em formato JSON:
        {
          "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"]
        }
      `;
    } else if (step === 'campaign_configuration') {
        prompt = `
        Como especialista em Facebook Ads, analise CUIDADOSAMENTE o briefing do cliente e crie uma configuração otimizada de campanha que reflita exatamente o público-alvo correto.

        **CLIENTE:**
        - Nome: ${client.name}
        - Setor: ${client.sector}
        - Orçamento Mensal: R$ ${client.monthly_budget || 5000}
        - Público-Alvo Básico: ${client.target_audience || 'Não informado'}
        - Objetivos: ${client.objectives || 'Não informado'}

        ${client.ai_briefing ? `
        **BRIEFING DETALHADO DO CLIENTE:**
        ${client.ai_briefing}

        **INSTRUÇÕES OBRIGATÓRIAS - ANÁLISE DO BRIEFING:**
        
        ETAPA 1 - IDENTIFICAÇÃO DO NEGÓCIO:
        - Leia o briefing e identifique: É B2B (empresa vende para empresas) ou B2C (empresa vende para consumidores)?
        - Quem é o VERDADEIRO tomador de decisão de compra mencionado no briefing?
        - Qual é o produto/serviço específico descrito no briefing?

        ETAPA 2 - IDENTIFICAÇÃO DO PÚBLICO CORRETO:
        - Se for B2B: O público são empresários, gestores, donos de negócio, profissionais de uma área específica
        - Se for B2C: O público são consumidores finais que usarão o produto/serviço
        
        ETAPA 3 - SEGMENTAÇÃO ESPECÍFICA BASEADA NO BRIEFING:
        
        **FAIXA ETÁRIA - REGRAS OBRIGATÓRIAS:**
        - NUNCA usar range completo 18-65 (isso é segmentação preguiçosa)
        - Analise o briefing e identifique a faixa etária REAL do público-alvo
        - Para B2B: geralmente 28-55 (tomadores de decisão)
        - Para produtos jovens (games, moda jovem): 18-35
        - Para produtos premium/luxo: 30-55
        - Para serviços profissionais: 25-50
        - Para produtos familiares: 28-45
        - SEMPRE justifique a escolha da faixa etária baseado no briefing
        
        Para B2B (empresas que vendem software, serviços, consultoria, etc.):
        - Demografia: Idade dos tomadores de decisão (geralmente 28-55), cargos específicos
        - Interesses: Ferramentas de negócio, softwares empresariais, gestão, empreendedorismo
        - Comportamentos: Administradores de empresas, tomadores de decisão de negócios
        - Exemplo: "Donos de restaurantes", "Gestores de TI", "Empreendedores do varejo"

        Para B2C (produtos para consumo pessoal):
        - Demografia: Idade dos usuários finais, localização específica
        - Interesses: Relacionados ao uso pessoal do produto
        - Comportamentos: Padrões de consumo pessoal
        
        **VALIDAÇÃO OBRIGATÓRIA:**
        - Se detectar produto B2B, JAMAIS usar segmentação de consumidor
        - Se detectar público empresarial, usar apenas interesses profissionais/empresariais
        - Rejeitar automaticamente segmentação genérica que não condiz com o briefing
        - NUNCA retornar ageMin: 18 e ageMax: 65 juntos (isso indica análise preguiçosa)
        ` : ''}

        **HISTÓRICO DE PERFORMANCE:**
        ${campaigns?.length ? campaigns.map(c => 
          `- ${c.name}: Gasto R$ ${c.spend}, CPA R$ ${c.cpa}, CTR ${c.ctr}%, ${c.conversions} conversões, ${c.impressions} impressões`
        ).join('\n') : 'Primeiro cliente - usar benchmarks do setor'}

        **PARÂMETROS:**
        - Etapa do Funil: ${funnelStage}
        - Tipo de Campanha: ${campaignType}

        **RESPOSTA OBRIGATÓRIA:**
        1. PRIMEIRO: Analise o briefing e identifique se é B2B ou B2C
        2. SEGUNDO: Extraia do briefing quem é exatamente o público-alvo
        3. TERCEIRO: Determine a FAIXA ETÁRIA ESPECÍFICA baseada no público (NÃO usar 18-65)
        4. QUARTO: Crie segmentação específica baseada no público real do briefing
        
        CRÍTICO: Retorne APENAS um JSON válido, sem markdown ou explicações.
        
        Baseado na análise obrigatória do briefing, crie uma configuração com SEGMENTAÇÃO REAL DO PÚBLICO:

        1. **Orçamento**: Baseado no orçamento mensal de R$ ${client.monthly_budget || 5000}
        2. **Segmentação**: ESPECÍFICA baseada no briefing (não genérica do setor)
        3. **Faixa Etária**: Específica para o público-alvo (NÃO 18-65)
        4. **CPA Alvo**: ${campaigns?.length ? 'Baseado no CPA histórico médio' : 'Usar benchmark do setor'}
        5. **Cronograma**: Otimizado para o público-alvo real

        JSON obrigatório (sem markdown):
        {
          "budget": {
            "daily": ${client.monthly_budget ? Math.round(client.monthly_budget / 30) : 167},
            "total": ${client.monthly_budget || 5000},
            "duration": 30,
            "distribution": "Estratégia detalhada de distribuição baseada no briefing"
          },
          "targeting": {
            "demographics": "Demografia específica do briefing (idade, gênero, localização, cargo/função)",
            "interests": ["interesses específicos do briefing", "não genéricos"],
            "behaviors": "Comportamentos específicos mencionados no briefing",
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
            "optimalHours": "Horários específicos baseados no briefing"
          },
          "adSets": [
            {"name": "Nome específico 1", "budget": ${Math.round((client.monthly_budget || 5000) * 0.5 / 30)}, "targeting": "Segmentação específica baseada no briefing", "ageMin": 25, "ageMax": 45},
            {"name": "Nome específico 2", "budget": ${Math.round((client.monthly_budget || 5000) * 0.3 / 30)}, "targeting": "Segunda segmentação do briefing", "ageMin": 25, "ageMax": 45},
            {"name": "Nome específico 3", "budget": ${Math.round((client.monthly_budget || 5000) * 0.2 / 30)}, "targeting": "Terceira segmentação do briefing", "ageMin": 25, "ageMax": 45}
          ],
          "recommendations": [
            "Recomendação específica baseada no briefing",
            "Recomendação estratégica do cliente", 
            "Otimização personalizada",
            "Monitoramento específico"
          ]
        }
        
        IMPORTANTE: Nos adSets, SEMPRE inclua ageMin e ageMax com valores específicos baseados na análise do público-alvo (NUNCA 18 e 65 juntos).
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