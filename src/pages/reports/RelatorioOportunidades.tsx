import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Plus,
  DollarSign,
  Lightbulb
} from "lucide-react";

interface OpportunityAnalysis {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'creative' | 'budget' | 'audience' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  impact: 'Alto' | 'Médio' | 'Baixo';
  effort: 'Alto' | 'Médio' | 'Baixo';
  estimatedSaving: number;
  timeframe: string;
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  implementationSteps: string[];
}

const RelatorioOportunidades = () => {
  const { metrics, clientsPerformance, campaignRankings, funnelMetrics } = useDashboardData();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [opportunitiesAnalysis, setOpportunitiesAnalysis] = useState<OpportunityAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<OpportunityAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'tipo-oportunidade',
      label: 'Tipo de Oportunidade',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as oportunidades' },
        { value: 'optimization', label: 'Otimização' },
        { value: 'creative', label: 'Criativos' },
        { value: 'budget', label: 'Orçamento' },
        { value: 'audience', label: 'Audiência' },
        { value: 'strategy', label: 'Estratégia' }
      ],
      placeholder: 'Todas as oportunidades'
    },
    {
      id: 'prioridade',
      label: 'Prioridade',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as prioridades' },
        { value: 'high', label: 'Alta' },
        { value: 'medium', label: 'Média' },
        { value: 'low', label: 'Baixa' }
      ],
      placeholder: 'Todas as prioridades'
    },
    {
      id: 'impacto',
      label: 'Impacto',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os impactos' },
        { value: 'Alto', label: 'Alto' },
        { value: 'Médio', label: 'Médio' },
        { value: 'Baixo', label: 'Baixo' }
      ],
      placeholder: 'Todos os impactos'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'economia-minima',
      label: 'Economia Mínima',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as economias' },
        { value: '5000', label: 'R$ 5.000+' },
        { value: '10000', label: 'R$ 10.000+' },
        { value: '20000', label: 'R$ 20.000+' }
      ],
      placeholder: 'Todas as economias'
    },
    {
      id: 'prazo',
      label: 'Prazo de Implementação',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os prazos' },
        { value: 'imediato', label: 'Imediato (1-7 dias)' },
        { value: 'curto', label: 'Curto (1-4 semanas)' },
        { value: 'medio', label: 'Médio (1-3 meses)' }
      ],
      placeholder: 'Todos os prazos'
    }
  ];

  const analyzeOpportunities = () => {
    if (!metrics || !clientsPerformance || !campaignRankings || !funnelMetrics) {
      return;
    }

    const opportunities: OpportunityAnalysis[] = [];

    // Oportunidades de otimização de campanhas
    campaignRankings.forEach((campaign, index) => {
      if (campaign.ctr < 1.5) {
        opportunities.push({
          id: `ctr-${index}`,
          title: `Otimizar CTR da campanha ${campaign.name}`,
          description: `CTR atual de ${campaign.ctr}% está abaixo da média de mercado (2%)`,
          type: 'creative',
          priority: campaign.ctr < 1 ? 'high' : 'medium',
          impact: campaign.spend > 10000 ? 'Alto' : 'Médio',
          effort: 'Médio',
          estimatedSaving: campaign.spend * 0.25,
          timeframe: '2-4 semanas',
          analysisStatus: campaign.ctr < 1 ? 'critical' : 'needs_attention',
          issues: [`CTR baixo: ${campaign.ctr}%`, 'Criativos podem estar saturados'],
          recommendations: ['Testar novos criativos', 'A/B test de headlines', 'Revisar copy'],
          implementationSteps: ['Criar 3-5 variações de criativos', 'Configurar testes A/B', 'Monitorar performance por 2 semanas']
        });
      }

      if (campaign.cpa > 100) {
        opportunities.push({
          id: `cpa-${index}`,
          title: `Reduzir CPA da campanha ${campaign.name}`,
          description: `CPA de R$ ${campaign.cpa} está acima do target de R$ 80`,
          type: 'optimization',
          priority: campaign.cpa > 150 ? 'high' : 'medium',
          impact: 'Alto',
          effort: 'Médio',
          estimatedSaving: (campaign.cpa - 80) * campaign.conversions,
          timeframe: '1-3 semanas',
          analysisStatus: campaign.cpa > 150 ? 'critical' : 'needs_attention',
          issues: [`CPA alto: R$ ${campaign.cpa}`, 'Audiência pode estar mal segmentada'],
          recommendations: ['Refinar audiência', 'Otimizar lances', 'Melhorar landing page'],
          implementationSteps: ['Analisar audiência atual', 'Criar lookalikes', 'Otimizar páginas de destino']
        });
      }
    });

    // Oportunidades de redistribuição de budget
    if (funnelMetrics.cpl && funnelMetrics.cpl > 80) {
      opportunities.push({
        id: 'budget-redistribution',
        title: 'Redistribuir orçamento entre campanhas',
        description: `CPL médio de R$ ${funnelMetrics.cpl} indica oportunidade de realocação`,
        type: 'budget',
        priority: 'high',
        impact: 'Alto',
        effort: 'Baixo',
        estimatedSaving: (metrics?.totalInvestment || 0) * 0.15,
        timeframe: '1 semana',
        analysisStatus: 'needs_attention',
        issues: ['Orçamento mal distribuído', 'Campanhas com baixo ROI recebendo muito budget'],
        recommendations: ['Mover budget para campanhas top performers', 'Pausar campanhas ineficientes'],
        implementationSteps: ['Identificar top 20% campanhas', 'Realocar 30% do budget', 'Monitorar resultados']
      });
    }

    // Oportunidades de audiência
    clientsPerformance.forEach((client, index) => {
      if (client.investment > 15000) {
        const efficiency = (client.investment / 60) / client.investment * 1000;
        if (efficiency < 15) {
          opportunities.push({
            id: `audience-${index}`,
            title: `Expandir audiências para ${client.name}`,
            description: `Alto investimento (R$ ${client.investment.toLocaleString()}) com baixa eficiência`,
            type: 'audience',
            priority: 'medium',
            impact: 'Alto',
            effort: 'Médio',
            estimatedSaving: client.investment * 0.20,
            timeframe: '3-6 semanas',
            analysisStatus: 'needs_attention',
            issues: ['Audiência limitada', 'Possível saturação'],
            recommendations: ['Criar lookalikes', 'Testar interesses similares', 'Expandir geo-targeting'],
            implementationSteps: ['Mapear audiências atuais', 'Criar 5 novas audiências', 'Implementar testes graduais']
          });
        }
      }
    });

    setOpportunitiesAnalysis(opportunities.slice(0, 12));
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = opportunitiesAnalysis;

    if (newFilters['tipo-oportunidade'] && newFilters['tipo-oportunidade'] !== 'todas') {
      filtered = filtered.filter(opp => opp.type === newFilters['tipo-oportunidade']);
    }

    if (newFilters['prioridade'] && newFilters['prioridade'] !== 'todas') {
      filtered = filtered.filter(opp => opp.priority === newFilters['prioridade']);
    }

    if (newFilters['impacto'] && newFilters['impacto'] !== 'todos') {
      filtered = filtered.filter(opp => opp.impact === newFilters['impacto']);
    }

    if (newFilters['economia-minima'] && newFilters['economia-minima'] !== 'todas') {
      const minSaving = parseInt(newFilters['economia-minima']);
      filtered = filtered.filter(opp => opp.estimatedSaving >= minSaving);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (opportunity: OpportunityAnalysis) => {
    await convertAlertToTask({
      title: opportunity.title,
      description: `${opportunity.description}. Economia estimada: R$ ${opportunity.estimatedSaving.toLocaleString()}. Passos: ${opportunity.implementationSteps.join(', ')}`,
      priority: opportunity.priority,
      type: 'optimization'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'creative': return <Lightbulb className="w-4 h-4" />;
      case 'budget': return <DollarSign className="w-4 h-4" />;
      case 'audience': return <Target className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = { high: 'destructive', medium: 'outline', low: 'secondary' } as const;
    const labels = { high: 'Alta', medium: 'Média', low: 'Baixa' };
    return <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>{labels[priority as keyof typeof labels] || priority}</Badge>;
  };

  const getStatusBadge = (status: OpportunityAnalysis['analysisStatus']) => {
    const variants = { excellent: 'default', good: 'secondary', needs_attention: 'outline', critical: 'destructive' } as const;
    const labels = { excellent: 'Excelente', good: 'Bom', needs_attention: 'Precisa de Atenção', critical: 'Crítico' };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  useEffect(() => {
    analyzeOpportunities();
  }, [metrics, clientsPerformance, campaignRankings, funnelMetrics]);

  useEffect(() => {
    setFilteredData(opportunitiesAnalysis);
  }, [opportunitiesAnalysis]);

  const filteredMetrics = {
    totalOpportunities: filteredData.length,
    highPriorityOpps: filteredData.filter(o => o.priority === 'high').length,
    totalPotentialSaving: filteredData.reduce((acc, o) => acc + o.estimatedSaving, 0),
    quickWins: filteredData.filter(o => o.effort === 'Baixo' && o.impact === 'Alto').length
  };

  return (
    <ReportLayout
      title="Relatório de Oportunidades"
      description="Identificação de melhorias e otimizações com potencial de economia"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Use os filtros para priorizar oportunidades por tipo, impacto e economia potencial"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Oportunidades Identificadas"
          value={filteredMetrics.totalOpportunities}
          subtitle="Melhorias potenciais"
        />
        <MetricCard
          title="Prioridade Alta"
          value={filteredMetrics.highPriorityOpps}
          trend={filteredMetrics.highPriorityOpps > 0 ? "up" : "neutral"}
          subtitle="Ação imediata"
        />
        <MetricCard
          title="Economia Potencial"
          value={`R$ ${filteredMetrics.totalPotentialSaving.toLocaleString()}`}
          trend="up"
          subtitle="Por mês"
        />
        <MetricCard
          title="Quick Wins"
          value={filteredMetrics.quickWins}
          trend="up"
          subtitle="Alto impacto, baixo esforço"
        />
      </div>

      <div className="space-y-4">
        {filteredData.length > 0 ? (
          filteredData.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(opportunity.type)}
                      <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                      {getPriorityBadge(opportunity.priority)}
                    </div>
                    <CardDescription>{opportunity.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        R$ {opportunity.estimatedSaving.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">economia/mês</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {opportunity.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Problemas Identificados
                    </h4>
                    <ul className="space-y-1">
                      {opportunity.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-destructive flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-destructive" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Plano de Implementação
                  </h4>
                  <ul className="space-y-1">
                    {opportunity.implementationSteps.map((step, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {index + 1}
                        </div>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{opportunity.impact}</div>
                    <div className="text-xs text-muted-foreground">Impacto</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{opportunity.effort}</div>
                    <div className="text-xs text-muted-foreground">Esforço</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{opportunity.timeframe}</div>
                    <div className="text-xs text-muted-foreground">Prazo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground capitalize">{opportunity.type}</div>
                    <div className="text-xs text-muted-foreground">Tipo</div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateTask(opportunity)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Implementar Oportunidade
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma oportunidade encontrada
              </h3>
              <p className="text-muted-foreground">
                Ajuste os filtros para ver mais oportunidades ou verifique se há dados suficientes para análise.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ReportLayout>
  );
};

export default RelatorioOportunidades;