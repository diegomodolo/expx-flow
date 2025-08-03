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

interface CampaignRecommendation {
  id: string;
  campaignId: string | null; // null para oportunidades de novas campanhas
  campaignName: string;
  type: 'suggestion' | 'alert' | 'opportunity' | 'new_campaign';
  category: string;
  title: string;
  description: string;
  justification: string;
  priority: 'high' | 'medium' | 'low';
  impact: string; // Ex: "+15% em CTR"
  expectedMetric: string; // CAC, CTR, ROI, etc.
  status: 'pending' | 'task_created' | 'dismissed';
  actionSteps: string[];
  effort: 'low' | 'medium' | 'high';
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
      const fallbackSuggestions = generateFallbackSuggestions(clientData, campaigns, suggestions.length);
      suggestions.push(...fallbackSuggestions);
    }

    // Sort by priority and type
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const typeOrder = { alert: 4, suggestion: 3, opportunity: 2, new_campaign: 1 };
        
        const aScore = priorityOrder[a.priority] + typeOrder[a.type];
        const bScore = priorityOrder[b.priority] + typeOrder[b.type];
        
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
): Promise<CampaignRecommendation[]> {
  const recommendations: CampaignRecommendation[] = [];
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  
  // Analisar cada campanha ativa individualmente
  for (const campaign of activeCampaigns) {
    const campaignRecommendations = await analyzeCampaignIndividually(campaign, clientData, activeCampaigns);
    recommendations.push(...campaignRecommendations);
  }
  
  // Adicionar oportunidades de novas campanhas
  const newCampaignOpportunities = generateNewCampaignOpportunities(clientData, activeCampaigns, historicalData);
  recommendations.push(...newCampaignOpportunities);
  
  return recommendations;
}

async function analyzeCampaignIndividually(
  campaign: CampaignData,
  clientData: ClientData,
  allActiveCampaigns: CampaignData[]
): Promise<CampaignRecommendation[]> {
  const recommendations: CampaignRecommendation[] = [];
  
  // 1. Análise de Performance - CPA Alto
  if (campaign.cpa > 0 && campaign.cpa > 100 && campaign.conversions > 0) {
    recommendations.push({
      id: `high-cpa-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: 'alert',
      category: 'Performance',
      title: `CPA alto na ${campaign.name}`,
      description: `CPA de R$ ${campaign.cpa.toFixed(2)} está acima do ideal`,
      justification: `CPA atual está ${Math.round(((campaign.cpa - 80) / 80) * 100)}% acima do benchmark de R$ 80`,
      priority: 'high',
      impact: 'Redução de 25-40% no CPA',
      expectedMetric: 'CPA',
      status: 'pending',
      actionSteps: [
        'Analisar audiências com CPA mais alto',
        'Pausar segmentos com CPA > R$ 150',
        'Otimizar criativos com baixo CTR',
        'Testar estratégias de bidding conservadoras'
      ],
      effort: 'medium'
    });
  }
  
  // 2. Análise de Performance - CTR Baixo
  if (campaign.ctr > 0 && campaign.ctr < 1.0) {
    recommendations.push({
      id: `low-ctr-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: 'suggestion',
      category: 'Criativos',
      title: `CTR baixo na ${campaign.name}`,
      description: `CTR de ${campaign.ctr.toFixed(2)}% está abaixo da média`,
      justification: 'CTR abaixo de 1% indica que os criativos não estão engajando adequadamente',
      priority: 'high',
      impact: 'Aumento de 30-50% no CTR',
      expectedMetric: 'CTR',
      status: 'pending',
      actionSteps: [
        'Criar 3-5 variações de criativos',
        'Testar diferentes formatos (vídeo/imagem)',
        'Renovar copy com foco em dor/benefício',
        'Implementar testes A/B estruturados'
      ],
      effort: 'medium'
    });
  }
  
  // 3. Análise de Frequência - Fadiga de Audiência
  if (campaign.frequency > 3) {
    recommendations.push({
      id: `high-frequency-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: 'alert',
      category: 'Audiência',
      title: `Fadiga de audiência na ${campaign.name}`,
      description: `Frequência de ${campaign.frequency.toFixed(1)} indica saturação`,
      justification: 'Frequência acima de 3 geralmente resulta em queda de performance e aumento de custos',
      priority: 'medium',
      impact: 'Redução de 15-25% no CPC',
      expectedMetric: 'CPC',
      status: 'pending',
      actionSteps: [
        'Expandir audiências similares em 20%',
        'Criar criativos exclusivos para alta frequência',
        'Implementar frequency capping de 2-3',
        'Testar lookalike audiences de 2-3%'
      ],
      effort: 'low'
    });
  }
  
  // 4. Análise de Orçamento - Oportunidade de Escala
  if (campaign.cpa > 0 && campaign.cpa < 60 && campaign.conversions >= 10) {
    const totalSpend = allActiveCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const campaignSpendPercentage = (campaign.spend / totalSpend) * 100;
    
    if (campaignSpendPercentage < 40) {
      recommendations.push({
        id: `scale-opportunity-${campaign.id}`,
        campaignId: campaign.id,
        campaignName: campaign.name,
        type: 'opportunity',
        category: 'Escalonamento',
        title: `Oportunidade de escalar ${campaign.name}`,
        description: `CPA baixo (R$ ${campaign.cpa.toFixed(2)}) com bom volume de conversões`,
        justification: `Performance excelente com CPA ${Math.round(((60 - campaign.cpa) / 60) * 100)}% abaixo do benchmark`,
        priority: 'medium',
        impact: 'Aumento de 40-60% no volume',
        expectedMetric: 'Volume de Conversões',
        status: 'pending',
        actionSteps: [
          'Aumentar budget diário em 30%',
          'Expandir para audiências similares',
          'Duplicar criativos performantes',
          'Monitorar CPA durante escalonamento'
        ],
        effort: 'low'
      });
    }
  }
  
  // 5. Análise de Conversões - Campanha sem Conversões
  if (campaign.spend > 50 && campaign.conversions === 0) {
    recommendations.push({
      id: `no-conversions-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: 'alert',
      category: 'Conversões',
      title: `${campaign.name} sem conversões`,
      description: `R$ ${campaign.spend.toFixed(2)} investidos sem conversões`,
      justification: 'Campanha com investimento significativo não está gerando resultados',
      priority: 'high',
      impact: 'Geração das primeiras conversões',
      expectedMetric: 'Conversões',
      status: 'pending',
      actionSteps: [
        'Revisar configuração de conversões',
        'Analisar fluxo da landing page',
        'Verificar público-alvo',
        'Considerar pausar temporariamente'
      ],
      effort: 'high'
    });
  }
  
  // 6. Análise de Landing Page - Alto CTR, Baixas Conversões
  if (campaign.ctr > 1.5 && campaign.conversions < 5 && campaign.clicks > 100) {
    recommendations.push({
      id: `landing-page-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: 'alert',
      category: 'Landing Page',
      title: `Problema na landing page - ${campaign.name}`,
      description: `Alto CTR (${campaign.ctr.toFixed(2)}%) mas baixas conversões`,
      justification: 'Discrepância entre engajamento no anúncio e conversões indica problema na página',
      priority: 'high',
      impact: 'Aumento de 50-80% nas conversões',
      expectedMetric: 'Taxa de Conversão',
      status: 'pending',
      actionSteps: [
        'Implementar hotjar para análise UX',
        'A/B testar headline da landing page',
        'Otimizar formulário de conversão',
        'Melhorar velocidade de carregamento'
      ],
      effort: 'high'
    });
  }
  
  return recommendations;
}

function generateNewCampaignOpportunities(
  clientData: ClientData,
  activeCampaigns: CampaignData[],
  historicalData: CampaignData[]
): CampaignRecommendation[] {
  const opportunities: CampaignRecommendation[] = [];
  
  // Verificar gaps no funil
  const hasTopoFunil = activeCampaigns.some(c => 
    c.objective?.includes('AWARENESS') || c.objective?.includes('REACH') || c.objective?.includes('VIDEO_VIEWS')
  );
  const hasMeioFunil = activeCampaigns.some(c => 
    c.objective?.includes('TRAFFIC') || c.objective?.includes('ENGAGEMENT') || c.objective?.includes('LEADS')
  );
  const hasFundoFunil = activeCampaigns.some(c => 
    c.objective?.includes('CONVERSIONS') || c.objective?.includes('CATALOG_SALES')
  );
  const hasRetencao = activeCampaigns.some(c => 
    c.objective?.includes('RETENTION') || c.name.toLowerCase().includes('remarketing')
  );
  
  // 1. Oportunidade de Topo de Funil
  if (!hasTopoFunil) {
    opportunities.push({
      id: 'new-awareness-campaign',
      campaignId: null,
      campaignName: 'Nova Campanha de Awareness',
      type: 'new_campaign',
      category: 'Topo de Funil',
      title: 'Criar campanha de awareness',
      description: 'Ausência de campanhas de awareness pode limitar o crescimento',
      justification: 'Sem campanhas de topo de funil, você pode estar perdendo potenciais clientes na fase de descoberta',
      priority: 'medium',
      impact: 'Aumento de 20-30% na base de prospects',
      expectedMetric: 'Reach e Awareness',
      status: 'pending',
      actionSteps: [
        'Definir persona para awareness',
        'Criar vídeos educacionais sobre o produto',
        'Configurar campanha de video views',
        'Implementar pixel para remarketing'
      ],
      effort: 'medium'
    });
  }
  
  // 2. Oportunidade de Remarketing
  if (!hasRetencao && activeCampaigns.length > 0) {
    opportunities.push({
      id: 'new-remarketing-campaign',
      campaignId: null,
      campaignName: 'Nova Campanha de Remarketing',
      type: 'new_campaign',
      category: 'Retenção',
      title: 'Implementar estratégia de remarketing',
      description: 'Campanhas de remarketing podem recuperar 70% dos visitantes perdidos',
      justification: 'Sem remarketing, você está perdendo clientes que já demonstraram interesse',
      priority: 'high',
      impact: 'Aumento de 40-60% na taxa de conversão',
      expectedMetric: 'ROAS',
      status: 'pending',
      actionSteps: [
        'Instalar pixel do Facebook',
        'Criar audiências de visitantes do site',
        'Desenvolver criativos específicos',
        'Configurar funil de remarketing completo'
      ],
      effort: 'medium'
    });
  }
  
  // 3. Oportunidade de Teste com Lookalike
  if (activeCampaigns.length > 0 && !activeCampaigns.some(c => c.name.toLowerCase().includes('lookalike'))) {
    opportunities.push({
      id: 'new-lookalike-campaign',
      campaignId: null,
      campaignName: 'Nova Campanha Lookalike',
      type: 'new_campaign',
      category: 'Expansão de Audiência',
      title: 'Testar audiências lookalike',
      description: 'Expandir para audiências similares aos seus melhores clientes',
      justification: 'Lookalike audiences podem encontrar novos clientes com perfil similar aos atuais',
      priority: 'medium',
      impact: 'Aumento de 25-40% no alcance qualificado',
      expectedMetric: 'CPA e Volume',
      status: 'pending',
      actionSteps: [
        'Criar audiência customizada de compradores',
        'Gerar lookalike de 1% e 2%',
        'Duplicar campanha performante',
        'Testar com 20% do budget total'
      ],
      effort: 'low'
    });
  }
  
  return opportunities;
}

async function generateAISuggestions(
  clientData: ClientData,
  campaigns: CampaignData[]
): Promise<CampaignRecommendation[]> {
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
      campaignId: null,
      campaignName: 'Recomendação Geral',
      type: 'suggestion',
      category: suggestion.category,
      title: suggestion.title,
      description: suggestion.description,
      justification: 'Baseado em análise de IA dos padrões de mercado',
      priority: 'medium',
      impact: suggestion.estimatedImpact,
      expectedMetric: 'Performance Geral',
      status: 'pending',
      actionSteps: [
        'Analisar dados detalhados',
        'Implementar mudanças gradualmente',
        'Monitorar resultados',
        'Ajustar conforme necessário'
      ],
      effort: 'medium'
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
): CampaignRecommendation[] {
  const fallbackSuggestions: CampaignRecommendation[] = [
    {
      id: 'competitor-analysis',
      campaignId: null,
      campaignName: 'Análise Geral',
      type: 'suggestion',
      category: 'Análise Competitiva',
      title: 'Monitoramento da concorrência',
      description: 'Analise os anúncios dos concorrentes para identificar oportunidades',
      justification: 'Conhecer a concorrência é fundamental para manter competitividade',
      priority: 'low',
      impact: 'Insights valiosos para estratégia',
      expectedMetric: 'Market Share',
      status: 'pending',
      actionSteps: [
        'Identificar principais concorrentes',
        'Monitorar biblioteca de anúncios',
        'Analisar criativos que funcionam',
        'Adaptar insights para suas campanhas'
      ],
      effort: 'low'
    },
    {
      id: 'creative-testing',
      campaignId: null,
      campaignName: 'Análise Geral',
      type: 'suggestion',
      category: 'Testes de Criativos',
      title: 'Programa de testes A/B contínuos',
      description: 'Implementar sistema de testes contínuos para otimização',
      justification: 'Testes contínuos são essenciais para manter competitividade',
      priority: 'medium',
      impact: 'Melhoria contínua de 5-10% mensal',
      expectedMetric: 'CTR e CVR',
      status: 'pending',
      actionSteps: [
        'Definir elementos para testar',
        'Criar cronograma de testes',
        'Implementar testes A/B',
        'Documentar aprendizados'
      ],
      effort: 'medium'
    },
    {
      id: 'audience-expansion',
      campaignId: null,
      campaignName: 'Análise Geral',
      type: 'opportunity',
      category: 'Expansão de Audiência',
      title: 'Oportunidade de expansão',
      description: 'Teste novas audiências para aumentar o alcance',
      justification: 'Expansão de audiências pode descobrir novos segmentos rentáveis',
      priority: 'medium',
      impact: 'Aumento de 20-40% no alcance',
      expectedMetric: 'Reach e CPM',
      status: 'pending',
      actionSteps: [
        'Criar audiências lookalike',
        'Testar interesses relacionados',
        'Configurar campanhas de teste',
        'Escalar audiências performantes'
      ],
      effort: 'low'
    },
    {
      id: 'mobile-optimization',
      campaignId: null,
      campaignName: 'Análise Geral',
      type: 'suggestion',
      category: 'Otimização Mobile',
      title: 'Otimização para dispositivos móveis',
      description: 'Maioria dos usuários acessa via mobile, otimize a experiência',
      justification: 'Mobile representa 80%+ do tráfego, otimização é crucial',
      priority: 'medium',
      impact: 'Melhoria de 15-30% nas conversões mobile',
      expectedMetric: 'Mobile CVR',
      status: 'pending',
      actionSteps: [
        'Analisar performance mobile vs desktop',
        'Otimizar landing pages para mobile',
        'Ajustar criativos para formato mobile',
        'Testar campanhas mobile-first'
      ],
      effort: 'medium'
    }
  ];

  // Return suggestions we haven't used yet
  return fallbackSuggestions.slice(currentCount - 3, currentCount + 2);
}