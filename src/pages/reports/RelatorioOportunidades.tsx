import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

const RelatorioOportunidades = () => {
  const { metrics, clientsPerformance, campaignRankings, funnelMetrics } = useDashboardData();

  const getOpportunities = () => {
    const opportunities = [];

    // Verificar se os dados existem antes de processar
    if (!metrics || !clientsPerformance || !campaignRankings || !funnelMetrics) {
      return opportunities;
    }

    // Oportunidades baseadas em investimento alto
    clientsPerformance.forEach(client => {
      if (client.investment > 15000) {
        opportunities.push({
          type: 'optimization',
          priority: 'high',
          title: `Otimizar ROI do cliente ${client.name}`,
          description: `Investimento alto: R$ ${client.investment.toFixed(2)} - revisar estratégia`,
          impact: 'Alto',
          effort: 'Médio',
          estimatedSaving: client.investment * 0.15
        });
      }
    });

    // Oportunidades baseadas em CTR baixo
    campaignRankings.forEach(campaign => {
      if (campaign.ctr < 1.5) {
        opportunities.push({
          type: 'creative',
          priority: 'medium',
          title: `Melhorar criativos da campanha ${campaign.name}`,
          description: `CTR atual: ${campaign.ctr}% - abaixo da média de 2%`,
          impact: 'Médio',
          effort: 'Baixo',
          estimatedSaving: campaign.spend * 0.15
        });
      }
    });

    // Oportunidades de budget - verificar se funnelMetrics e metrics existem
    if (funnelMetrics.cpl && funnelMetrics.cpl > 80 && metrics.totalInvestment) {
      opportunities.push({
        type: 'budget',
        priority: 'high',
        title: 'Redistribuir orçamento entre campanhas',
        description: `CPL médio: R$ ${funnelMetrics.cpl} - redistribuição pode reduzir custos`,
        impact: 'Alto',
        effort: 'Baixo',
        estimatedSaving: metrics.totalInvestment * 0.20
      });
    }

    return opportunities.slice(0, 8);
  };

  const opportunities = getOpportunities();
  const totalPotentialSaving = opportunities.reduce((acc, opp) => acc + (opp.estimatedSaving || 0), 0);

  // Loading state
  if (!metrics || !clientsPerformance || !campaignRankings || !funnelMetrics) {
    return (
      <ReportLayout
        title="Relatório de Oportunidades"
        description="Identificação de melhorias e otimizações com IA"
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ReportLayout>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'creative': return <Target className="w-4 h-4" />;
      case 'budget': return <TrendingDown className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <ReportLayout
      title="Relatório de Oportunidades"
      description="Identificação de melhorias e otimizações com IA"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Oportunidades Identificadas"
          value={opportunities.length}
          trend="up"
        />
        <MetricCard
          title="Economia Potencial"
          value={`R$ ${totalPotentialSaving.toLocaleString()}`}
          subtitle="Por mês"
          trend="up"
        />
        <MetricCard
          title="Prioridade Alta"
          value={opportunities.filter(o => o.priority === 'high').length}
          trend="neutral"
        />
        <MetricCard
          title="Implementação Rápida"
          value={opportunities.filter(o => o.effort === 'Baixo').length}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Oportunidades por Impacto</CardTitle>
            <CardDescription>Classificadas por potencial de melhoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opportunities
                .sort((a, b) => (b.estimatedSaving || 0) - (a.estimatedSaving || 0))
                .slice(0, 5)
                .map((opportunity, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(opportunity.type)}
                      <h4 className="font-medium">{opportunity.title}</h4>
                    </div>
                    <Badge className={getPriorityColor(opportunity.priority)}>
                      {opportunity.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {opportunity.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-xs">
                      <span>Impacto: <strong>{opportunity.impact}</strong></span>
                      <span>Esforço: <strong>{opportunity.effort}</strong></span>
                    </div>
                    {opportunity.estimatedSaving && (
                      <span className="text-sm font-semibold text-green-600">
                        +R$ {opportunity.estimatedSaving.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>Tipos de oportunidades encontradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['optimization', 'creative', 'budget'].map((type) => {
                const count = opportunities.filter(o => o.type === type).length;
                const percentage = opportunities.length > 0 ? (count / opportunities.length * 100).toFixed(1) : 0;
                const typeLabels = {
                  optimization: 'Otimização',
                  creative: 'Criativos',
                  budget: 'Orçamento'
                };
                
                return (
                  <div key={type} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(type)}
                      <span className="text-sm font-medium">{typeLabels[type as keyof typeof typeLabels]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plano de Ação Recomendado</CardTitle>
          <CardDescription>Próximos passos para implementação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {opportunities
              .filter(o => o.priority === 'high')
              .slice(0, 3)
              .map((opportunity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{opportunity.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Economia estimada: R$ {(opportunity.estimatedSaving || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button size="sm">
                  Implementar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioOportunidades;