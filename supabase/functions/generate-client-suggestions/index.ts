import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignData {
  name: string;
  status: string;
  spend: number;
  conversions: number;
  cpa: number;
  ctr: number;
  frequency: number;
}

interface ClientData {
  name: string;
  sector: string;
  monthly_budget: number;
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

    console.log('Generating suggestions for:', clientData?.name);
    
    // Generate fast rule-based suggestions
    const suggestions = generateQuickSuggestions(clientData, campaigns || []);

    console.log(`Generated ${suggestions.length} suggestions`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
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

function generateQuickSuggestions(
  clientData: ClientData,
  campaigns: CampaignData[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Limit processing to top 10 campaigns by spend
  const topCampaigns = campaigns
    .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    .slice(0, 10);
  
  const activeCampaigns = topCampaigns.filter(c => c.status === 'active');
  
  // Rule 1: Low CTR Detection (quick calculation)
  if (activeCampaigns.length > 0) {
    const avgCTR = activeCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / activeCampaigns.length;
    
    if (avgCTR < 1.0) {
      const lowCTRCampaigns = activeCampaigns.filter(c => (c.ctr || 0) < avgCTR);
      suggestions.push({
        id: 'low-ctr',
        type: 'optimization',
        category: 'Otimização de Criativos',
        title: 'CTR abaixo da média',
        description: `CTR médio de ${avgCTR.toFixed(2)}% pode ser melhorado`,
        action: 'Renovar criativos e testar novos formatos',
        campaigns: lowCTRCampaigns.slice(0, 2).map(c => c.name),
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImpact: 'Aumento de 20-40% no CTR',
        implementationSteps: [
          'Analisar criativos de melhor performance',
          'Criar 3-5 variações',
          'Implementar testes A/B'
        ],
        relatedMetrics: ['CTR', 'CPC']
      });
    }
  }

  // Rule 2: High Frequency Detection
  const highFreqCampaigns = activeCampaigns.filter(c => (c.frequency || 0) > 3);
  if (highFreqCampaigns.length > 0) {
    suggestions.push({
      id: 'high-frequency',
      type: 'warning',
      category: 'Gestão de Audiência',
      title: 'Fadiga de audiência',
      description: `${highFreqCampaigns.length} campanha(s) com frequência alta`,
      action: 'Expandir audiências ou renovar criativos',
      campaigns: highFreqCampaigns.slice(0, 2).map(c => c.name),
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      estimatedImpact: 'Redução de 10-20% no CPC',
      implementationSteps: [
        'Expandir audiências similar',
        'Criar criativos exclusivos',
        'Implementar frequency capping'
      ],
      relatedMetrics: ['Frequency', 'CPC']
    });
  }

  // Rule 3: High CPA Detection (simple check)
  if (activeCampaigns.length > 0) {
    const totalSpend = activeCampaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalConv = activeCampaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const avgCPA = totalConv > 0 ? totalSpend / totalConv : 0;
    
    const highCPACampaigns = activeCampaigns.filter(c => 
      (c.cpa || 0) > avgCPA * 1.5 && (c.cpa || 0) > 0
    );
    
    if (highCPACampaigns.length > 0) {
      suggestions.push({
        id: 'high-cpa',
        type: 'critical',
        category: 'Otimização de Custo',
        title: 'CPA acima da média',
        description: `${highCPACampaigns.length} campanha(s) com CPA 50% acima da média`,
        action: 'Otimizar segmentação e criativos',
        campaigns: highCPACampaigns.slice(0, 2).map(c => c.name),
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImpact: 'Redução de 20-30% no CPA',
        implementationSteps: [
          'Pausar anúncios de baixa performance',
          'Refinar segmentação',
          'Testar novos criativos'
        ],
        relatedMetrics: ['CPA', 'ROAS']
      });
    }
  }

  // Fill with generic suggestions if needed
  while (suggestions.length < 5) {
    const fallback = getFallbackSuggestion(suggestions.length);
    if (fallback) suggestions.push(fallback);
    else break;
  }

  return suggestions.slice(0, 6); // Max 6 suggestions
}

function getFallbackSuggestion(index: number): Suggestion | null {
  const fallbacks: Suggestion[] = [
    {
      id: 'creative-testing',
      type: 'optimization',
      category: 'Testes de Criativos',
      title: 'Programa de testes A/B',
      description: 'Implementar testes contínuos para otimização',
      action: 'Estabelecer cronograma de testes semanais',
      campaigns: [],
      priority: 'medium',
      impact: 'high',
      effort: 'medium',
      estimatedImpact: 'Melhoria de 5-10% mensal',
      implementationSteps: [
        'Definir elementos para testar',
        'Criar cronograma',
        'Documentar aprendizados'
      ],
      relatedMetrics: ['CTR', 'CVR']
    },
    {
      id: 'audience-expansion',
      type: 'opportunity',
      category: 'Expansão de Audiência',
      title: 'Oportunidade de expansão',
      description: 'Teste novas audiências para aumentar alcance',
      action: 'Criar campanhas lookalike',
      campaigns: [],
      priority: 'medium',
      impact: 'medium',
      effort: 'low',
      estimatedImpact: 'Aumento de 20-40% no alcance',
      implementationSteps: [
        'Criar audiências lookalike',
        'Testar interesses relacionados',
        'Escalar performantes'
      ],
      relatedMetrics: ['Reach', 'CPM']
    },
    {
      id: 'remarketing',
      type: 'opportunity',
      category: 'Remarketing',
      title: 'Estratégia de remarketing',
      description: 'Capture visitantes que não converteram',
      action: 'Configurar pixels e campanhas',
      campaigns: [],
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      estimatedImpact: 'Aumento de 25-50% na conversão',
      implementationSteps: [
        'Instalar pixel',
        'Criar audiências customizadas',
        'Desenvolver criativos'
      ],
      relatedMetrics: ['ROAS', 'CVR']
    }
  ];

  return fallbacks[index] || null;
}
