import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignData {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  conversions: number;
  cpa: number;
  cpc: number;
  ctr: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  period: string;
  platforms: string;
}

interface ClientData {
  id: string;
  name: string;
  sector: string;
  product_name: string;
  monthly_budget: number;
  leads_generated: number;
  status: string;
  objectives: string;
  preferred_platforms: string[];
  target_audience: string;
  voice_tone: string;
}

interface Suggestion {
  id: string;
  type: 'critical' | 'warning' | 'opportunity' | 'optimization';
  category: string;
  title: string;
  description: string;
  action: string;
  campaigns: string[];
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  implementationSteps: string[];
  relatedMetrics: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientData, campaigns } = await req.json();

    console.log('Generating suggestions for client:', clientData?.name);
    console.log('Number of campaigns:', campaigns?.length || 0);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get historical data for better analysis
    const { data: historicalData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Generate comprehensive suggestions
    const suggestions = await generateComprehensiveSuggestions(
      clientData,
      campaigns,
      historicalData || []
    );

    // If we have less than 5 suggestions, add AI-generated ones
    if (suggestions.length < 5) {
      const aiSuggestions = await generateAISuggestions(clientData, campaigns);
      suggestions.push(...aiSuggestions);
    }

    // Ensure we always have at least 5 suggestions
    while (suggestions.length < 5) {
      suggestions.push(...generateFallbackSuggestions(clientData, campaigns, suggestions.length));
    }

    // Sort by priority and impact
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const impactOrder = { high: 3, medium: 2, low: 1 };
        
        const aScore = priorityOrder[a.priority] + impactOrder[a.impact];
        const bScore = priorityOrder[b.priority] + impactOrder[b.impact];
        
        return bScore - aScore;
      })
      .slice(0, 8); // Return max 8 suggestions

    console.log(`Generated ${sortedSuggestions.length} suggestions`);

    return new Response(JSON.stringify({ suggestions: sortedSuggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao gerar sugestões', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateComprehensiveSuggestions(
  clientData: ClientData,
  campaigns: CampaignData[],
  historicalData: CampaignData[]
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused');
  
  // 1. Budget Distribution Analysis
  if (activeCampaigns.length > 0) {
    const totalSpend = activeCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const highSpendCampaigns = activeCampaigns.filter(c => (c.spend || 0) > totalSpend * 0.3);
    
    if (highSpendCampaigns.length === 1 && activeCampaigns.length > 3) {
      suggestions.push({
        id: 'budget-concentration',
        type: 'warning',
        category: 'Distribuição de Orçamento',
        title: 'Concentração excessiva de budget',
        description: `${Math.round((highSpendCampaigns[0].spend / totalSpend) * 100)}% do orçamento está concentrado em apenas uma campanha`,
        action: 'Redistribuir budget para diversificar riscos e testar outras estratégias',
        campaigns: highSpendCampaigns.map(c => c.name),
        priority: 'medium',
        impact: 'medium',
        effort: 'low',
        estimatedImpact: 'Redução de 15-25% no risco de performance',
        implementationSteps: [
          'Identificar campanhas com bom potencial',
          'Reduzir budget da campanha principal em 20%',
          'Redistribuir para 2-3 campanhas promissoras',
          'Monitorar performance por 7 dias'
        ],
        relatedMetrics: ['CPA', 'ROAS', 'Volume de Conversões']
      });
    }
  }

  // 2. Time-based Performance Analysis
  const recentCampaigns = campaigns.filter(c => {
    const campaignDate = new Date(c.period);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return campaignDate >= thirtyDaysAgo;
  });

  if (recentCampaigns.length > 0) {
    const avgCTR = recentCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / recentCampaigns.length;
    if (avgCTR < 1.0) {
      suggestions.push({
        id: 'low-ctr-optimization',
        type: 'optimization',
        category: 'Otimização de Criativos',
        title: 'CTR abaixo da média do mercado',
        description: `CTR médio de ${avgCTR.toFixed(2)}% está abaixo da média de mercado (1-2%)`,
        action: 'Renovar criativos e testar novos formatos de anúncio',
        campaigns: recentCampaigns.filter(c => (c.ctr || 0) < avgCTR).map(c => c.name).slice(0, 3),
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImpact: 'Aumento de 20-40% no CTR',
        implementationSteps: [
          'Analisar criativos de melhor performance',
          'Criar 3-5 variações de copy e visual',
          'Implementar testes A/B',
          'Pausar criativos com CTR < 0.8%'
        ],
        relatedMetrics: ['CTR', 'CPC', 'Relevance Score']
      });
    }
  }

  // 3. Frequency Analysis
  const highFrequencyCampaigns = activeCampaigns.filter(c => (c.frequency || 0) > 3);
  if (highFrequencyCampaigns.length > 0) {
    suggestions.push({
      id: 'high-frequency-fatigue',
      type: 'warning',
      category: 'Gestão de Audiência',
      title: 'Fadiga de audiência detectada',
      description: `${highFrequencyCampaigns.length} campanha(s) com frequência acima de 3, indicando possível fadiga`,
      action: 'Expandir audiências ou renovar criativos para reduzir frequência',
      campaigns: highFrequencyCampaigns.map(c => c.name),
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      estimatedImpact: 'Redução de 10-20% no CPC',
      implementationSteps: [
        'Expandir audiências similar em 10-20%',
        'Criar criativos exclusivos para alta frequência',
        'Implementar frequency capping',
        'Testar lookalike audiences'
      ],
      relatedMetrics: ['Frequency', 'CPC', 'CTR']
    });
  }

  // 4. Device Performance Analysis
  if (activeCampaigns.length > 0) {
    suggestions.push({
      id: 'device-optimization',
      type: 'optimization',
      category: 'Segmentação de Dispositivos',
      title: 'Otimização por dispositivo',
      description: 'Analisar performance por dispositivo pode revelar oportunidades de otimização',
      action: 'Segmentar campanhas por dispositivo e ajustar bids accordingly',
      campaigns: activeCampaigns.slice(0, 3).map(c => c.name),
      priority: 'low',
      impact: 'medium',
      effort: 'low',
      estimatedImpact: 'Melhoria de 5-15% na eficiência',
      implementationSteps: [
        'Analisar relatório de dispositivos',
        'Identificar dispositivos com melhor performance',
        'Criar campanhas específicas para dispositivos',
        'Ajustar bids por dispositivo'
      ],
      relatedMetrics: ['CPA por dispositivo', 'CTR por dispositivo']
    });
  }

  // 5. Seasonality and Timing
  suggestions.push({
    id: 'timing-optimization',
    type: 'optimization',
    category: 'Horários de Veiculação',
    title: 'Otimização de horários',
    description: 'Análise de horários pode identificar janelas de melhor performance',
    action: 'Implementar dayparting baseado em dados de conversão',
    campaigns: activeCampaigns.slice(0, 2).map(c => c.name),
    priority: 'low',
    impact: 'medium',
    effort: 'low',
    estimatedImpact: 'Redução de 10-20% no CPA',
    implementationSteps: [
      'Analisar relatório de horários',
      'Identificar horários de pico',
      'Configurar agendamento otimizado',
      'Aumentar bids em horários de alta conversão'
    ],
    relatedMetrics: ['CPA por horário', 'Volume de conversões']
  });

  // 6. Landing Page Analysis
  if (activeCampaigns.some(c => (c.ctr || 0) > 1.5 && (c.conversions || 0) < 5)) {
    suggestions.push({
      id: 'landing-page-optimization',
      type: 'critical',
      category: 'Landing Page',
      title: 'Possível problema na landing page',
      description: 'Alto CTR mas baixas conversões indica problema na página de destino',
      action: 'Otimizar landing page para melhorar taxa de conversão',
      campaigns: activeCampaigns.filter(c => (c.ctr || 0) > 1.5 && (c.conversions || 0) < 5).map(c => c.name),
      priority: 'high',
      impact: 'high',
      effort: 'high',
      estimatedImpact: 'Aumento de 30-60% nas conversões',
      implementationSteps: [
        'Implementar Google Analytics para tracking',
        'Analisar taxa de rejeição da página',
        'Testar diferentes versões da landing page',
        'Otimizar formulários e CTAs'
      ],
      relatedMetrics: ['Taxa de conversão', 'Bounce rate', 'Time on page']
    });
  }

  return suggestions;
}

async function generateAISuggestions(
  clientData: ClientData,
  campaigns: CampaignData[]
): Promise<Suggestion[]> {
  if (!openAIApiKey) {
    console.log('OpenAI API key not found, skipping AI suggestions');
    return [];
  }

  try {
    const prompt = `Como especialista em marketing digital, analise os dados do cliente e campanhas abaixo e gere 3 sugestões específicas e acionáveis:

Cliente: ${clientData.name}
Setor: ${clientData.sector}
Produto: ${clientData.product_name}
Orçamento mensal: R$ ${clientData.monthly_budget}
Objetivo: ${clientData.objectives}

Campanhas ativas: ${campaigns.filter(c => c.status === 'active').length}
Total investido: R$ ${campaigns.reduce((sum, c) => sum + (c.spend || 0), 0)}
Total de conversões: ${campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)}

Para cada sugestão, forneça:
1. Título conciso
2. Descrição específica do problema/oportunidade
3. Ação recomendada
4. Impacto estimado
5. Categoria (ex: "Segmentação", "Criativos", "Orçamento")

Responda em JSON no formato:
{
  "suggestions": [
    {
      "title": "título",
      "description": "descrição",
      "action": "ação",
      "category": "categoria",
      "estimatedImpact": "impacto estimado"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Você é um especialista em marketing digital e otimização de campanhas.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    return aiResponse.suggestions.map((suggestion: any, index: number) => ({
      id: `ai-suggestion-${index}`,
      type: 'optimization',
      category: suggestion.category,
      title: suggestion.title,
      description: suggestion.description,
      action: suggestion.action,
      campaigns: [],
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      estimatedImpact: suggestion.estimatedImpact,
      implementationSteps: [
        'Analisar dados detalhados',
        'Implementar mudanças gradualmente',
        'Monitorar resultados',
        'Ajustar conforme necessário'
      ],
      relatedMetrics: ['Performance geral']
    }));

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [];
  }
}

function generateFallbackSuggestions(
  clientData: ClientData,
  campaigns: CampaignData[],
  currentCount: number
): Suggestion[] {
  const fallbackSuggestions: Suggestion[] = [
    {
      id: 'competitor-analysis',
      type: 'optimization',
      category: 'Análise Competitiva',
      title: 'Monitoramento da concorrência',
      description: 'Analise os anúncios dos concorrentes para identificar oportunidades',
      action: 'Implementar monitoramento regular da concorrência',
      campaigns: [],
      priority: 'low',
      impact: 'medium',
      effort: 'low',
      estimatedImpact: 'Insights valiosos para estratégia',
      implementationSteps: [
        'Identificar principais concorrentes',
        'Monitorar biblioteca de anúncios',
        'Analisar criativos que funcionam',
        'Adaptar insights para suas campanhas'
      ],
      relatedMetrics: ['Market share', 'Competitive positioning']
    },
    {
      id: 'creative-testing',
      type: 'optimization',
      category: 'Testes de Criativos',
      title: 'Programa de testes A/B contínuos',
      description: 'Implementar sistema de testes contínuos para otimização',
      action: 'Estabelecer cronograma de testes semanais',
      campaigns: [],
      priority: 'medium',
      impact: 'high',
      effort: 'medium',
      estimatedImpact: 'Melhoria contínua de 5-10% mensal',
      implementationSteps: [
        'Definir elementos para testar',
        'Criar cronograma de testes',
        'Implementar testes A/B',
        'Documentar aprendizados'
      ],
      relatedMetrics: ['CTR', 'CVR', 'CPA']
    },
    {
      id: 'audience-expansion',
      type: 'opportunity',
      category: 'Expansão de Audiência',
      title: 'Oportunidade de expansão',
      description: 'Teste novas audiências para aumentar o alcance',
      action: 'Criar campanhas para audiências lookalike e interesses afins',
      campaigns: [],
      priority: 'medium',
      impact: 'medium',
      effort: 'low',
      estimatedImpact: 'Aumento de 20-40% no alcance',
      implementationSteps: [
        'Criar audiências lookalike',
        'Testar interesses relacionados',
        'Configurar campanhas de teste',
        'Escalar audiências performantes'
      ],
      relatedMetrics: ['Reach', 'CPM', 'Frequency']
    },
    {
      id: 'remarketing-setup',
      type: 'opportunity',
      category: 'Remarketing',
      title: 'Implementar estratégia de remarketing',
      description: 'Capture visitantes que não converteram na primeira visita',
      action: 'Configurar pixels e criar campanhas de remarketing',
      campaigns: [],
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      estimatedImpact: 'Aumento de 25-50% na taxa de conversão',
      implementationSteps: [
        'Instalar pixel do Facebook',
        'Criar audiências customizadas',
        'Desenvolver criativos específicos',
        'Configurar funil de remarketing'
      ],
      relatedMetrics: ['ROAS', 'Conversion rate', 'Customer acquisition']
    },
    {
      id: 'mobile-optimization',
      type: 'optimization',
      category: 'Otimização Mobile',
      title: 'Otimização para dispositivos móveis',
      description: 'Maioria dos usuários acessa via mobile, otimize a experiência',
      action: 'Priorizar experiência mobile em campanhas e landing pages',
      campaigns: [],
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      estimatedImpact: 'Melhoria de 15-30% nas conversões mobile',
      implementationSteps: [
        'Analisar performance mobile vs desktop',
        'Otimizar landing pages para mobile',
        'Ajustar criativos para formato mobile',
        'Testar campanhas mobile-first'
      ],
      relatedMetrics: ['Mobile conversion rate', 'Mobile CTR']
    }
  ];

  // Return suggestions we haven't used yet
  return fallbackSuggestions.slice(currentCount - 3, currentCount + 2);
}