import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useClients } from "@/hooks/useClients";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { TrendingUp, Target, DollarSign, AlertTriangle, Plus, Award } from "lucide-react";

interface ExecutiveSummary {
  id: string;
  category: string;
  title: string;
  description: string;
  kpi: string;
  value: number | string;
  target: number | string;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  trend: 'up' | 'down' | 'neutral';
  insights: string[];
  recommendations: string[];
  impact: 'Alto' | 'Médio' | 'Baixo';
}

const RelatorioExecutivo = () => {
  const { metrics, clientsPerformance, campaignRankings, loading } = useDashboardData();
  const { clients } = useClients();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary[]>([]);
  const [filteredData, setFilteredData] = useState<ExecutiveSummary[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'categoria',
      label: 'Categoria',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as categorias' },
        { value: 'financeiro', label: 'Financeiro' },
        { value: 'performance', label: 'Performance' },
        { value: 'crescimento', label: 'Crescimento' },
        { value: 'operacional', label: 'Operacional' }
      ],
      placeholder: 'Todas as categorias'
    },
    {
      id: 'status-kpi',
      label: 'Status do KPI',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'critical', label: 'Crítico' },
        { value: 'needs_attention', label: 'Atenção Necessária' },
        { value: 'good', label: 'No Alvo' },
        { value: 'excellent', label: 'Superando Metas' }
      ],
      placeholder: 'Todos os status'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'impacto',
      label: 'Impacto no Negócio',
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

  const generateExecutiveSummary = () => {
    if (!metrics || !clientsPerformance || !campaignRankings) return;

    const roi = (metrics.totalInvestment || 0) > 0 ? 
      (((metrics.totalLeads || 0) * 150 - (metrics.totalInvestment || 0)) / (metrics.totalInvestment || 1) * 100) : 0;

    const avgCPA = (metrics.totalInvestment || 0) / (metrics.totalLeads || 1);
    const activeClients = clients.filter(c => clientsPerformance.some(cp => cp.name === c.name)).length;

    const summary: ExecutiveSummary[] = [
      {
        id: 'roi',
        category: 'financeiro',
        title: 'Retorno sobre Investimento',
        description: 'ROI geral das campanhas de marketing',
        kpi: 'ROI',
        value: `${roi.toFixed(1)}%`,
        target: '200%',
        status: roi > 200 ? 'excellent' : roi > 150 ? 'good' : roi > 100 ? 'needs_attention' : 'critical',
        trend: roi > 150 ? 'up' : 'down',
        insights: [
          `ROI atual de ${roi.toFixed(1)}% vs target de 200%`,
          `Investimento total: R$ ${(metrics.totalInvestment || 0).toLocaleString()}`
        ],
        recommendations: roi < 150 ? ['Revisar campanhas com baixo ROI', 'Otimizar targeting'] : ['Manter estratégia atual'],
        impact: 'Alto'
      },
      {
        id: 'cpa',
        category: 'performance',
        title: 'Custo por Aquisição',
        description: 'Eficiência na geração de leads',
        kpi: 'CPA Médio',
        value: `R$ ${avgCPA.toFixed(2)}`,
        target: 'R$ 80,00',
        status: avgCPA < 60 ? 'excellent' : avgCPA < 80 ? 'good' : avgCPA < 120 ? 'needs_attention' : 'critical',
        trend: avgCPA < 80 ? 'up' : 'down',
        insights: [
          `CPA atual: R$ ${avgCPA.toFixed(2)} vs target R$ 80`,
          `Total de leads: ${metrics.totalLeads || 0}`
        ],
        recommendations: avgCPA > 80 ? ['Otimizar audiências', 'Melhorar criativos'] : ['Escalar campanhas eficientes'],
        impact: 'Alto'
      },
      {
        id: 'crescimento',
        category: 'crescimento',
        title: 'Crescimento da Base de Clientes',
        description: 'Expansão do portfólio de clientes',
        kpi: 'Clientes Ativos',
        value: activeClients,
        target: activeClients + 5,
        status: activeClients > 20 ? 'excellent' : activeClients > 15 ? 'good' : 'needs_attention',
        trend: 'neutral',
        insights: [
          `${activeClients} clientes ativos no período`,
          `Meta de crescimento: +5 clientes/mês`
        ],
        recommendations: ['Programa de indicações', 'Prospecção ativa', 'Melhoria do atendimento'],
        impact: 'Médio'
      },
      {
        id: 'campanhas-ativas',
        category: 'operacional',
        title: 'Campanhas em Execução',
        description: 'Volume operacional de campanhas',
        kpi: 'Campanhas Ativas',
        value: campaignRankings.filter(c => c.status === 'active').length,
        target: '50+',
        status: campaignRankings.length > 50 ? 'excellent' : campaignRankings.length > 30 ? 'good' : 'needs_attention',
        trend: 'up',
        insights: [
          `${campaignRankings.length} campanhas no total`,
          `${campaignRankings.filter(c => c.status === 'active').length} campanhas ativas`
        ],
        recommendations: ['Otimizar campanhas existentes', 'Expandir para novos canais'],
        impact: 'Médio'
      }
    ];

    setExecutiveSummary(summary);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = executiveSummary;

    if (newFilters['categoria'] && newFilters['categoria'] !== 'todas') {
      filtered = filtered.filter(item => item.category === newFilters['categoria']);
    }

    if (newFilters['status-kpi'] && newFilters['status-kpi'] !== 'todos') {
      filtered = filtered.filter(item => item.status === newFilters['status-kpi']);
    }

    if (newFilters['impacto'] && newFilters['impacto'] !== 'todos') {
      filtered = filtered.filter(item => item.impact === newFilters['impacto']);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (item: ExecutiveSummary) => {
    await convertAlertToTask({
      title: `Ação executiva: ${item.title}`,
      description: `KPI: ${item.kpi} (${item.value}). Recomendações: ${item.recommendations.join(', ')}`,
      priority: item.status === 'critical' ? 'high' : 'medium',
      type: 'strategic'
    });
  };

  const getStatusBadge = (status: ExecutiveSummary['status']) => {
    const variants = { excellent: 'default', good: 'secondary', needs_attention: 'outline', critical: 'destructive' } as const;
    const labels = { excellent: 'Superando', good: 'No Alvo', needs_attention: 'Atenção', critical: 'Crítico' };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financeiro': return <DollarSign className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'crescimento': return <Target className="w-4 h-4" />;
      case 'operacional': return <Award className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    if (metrics && clientsPerformance && campaignRankings) {
      generateExecutiveSummary();
    }
  }, [metrics, clientsPerformance, campaignRankings]);

  useEffect(() => {
    setFilteredData(executiveSummary);
  }, [executiveSummary]);

  if (loading || !metrics) {
    return (
      <ReportLayout title="Relatório Executivo" description="Carregando dados...">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ReportLayout>
    );
  }

  const filteredMetrics = {
    totalKPIs: filteredData.length,
    criticalKPIs: filteredData.filter(k => k.status === 'critical').length,
    excellentKPIs: filteredData.filter(k => k.status === 'excellent').length,
    avgImpact: filteredData.filter(k => k.impact === 'Alto').length
  };

  return (
    <ReportLayout
      title="Relatório Executivo"
      description="Dashboard estratégico com KPIs e insights de negócio"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="KPIs Monitorados"
          value={filteredMetrics.totalKPIs}
          subtitle="Indicadores executivos"
        />
        <MetricCard
          title="KPIs Críticos"
          value={filteredMetrics.criticalKPIs}
          trend={filteredMetrics.criticalKPIs > 0 ? "down" : "up"}
          subtitle="Requerem ação imediata"
        />
        <MetricCard
          title="Superando Metas"
          value={filteredMetrics.excellentKPIs}
          trend="up"
          subtitle="Performance excelente"
        />
        <MetricCard
          title="Alto Impacto"
          value={filteredMetrics.avgImpact}
          subtitle="KPIs críticos para negócio"
        />
      </div>

      <div className="space-y-4">
        {filteredData.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getCategoryIcon(item.category)}
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <Badge variant="outline" className="capitalize">{item.category}</Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">Atual</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{item.target}</div>
                  <div className="text-xs text-muted-foreground">Meta</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.trend === 'up' ? '↑' : '↓'}
                  </div>
                  <div className="text-xs text-muted-foreground">Tendência</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{item.impact}</div>
                  <div className="text-xs text-muted-foreground">Impacto</div>
                </div>
              </div>

              {item.insights.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Insights Executivos
                  </h4>
                  <ul className="space-y-1">
                    {item.insights.map((insight, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {item.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Ações Recomendadas
                  </h4>
                  <ul className="space-y-1">
                    {item.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-orange-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(item.status === 'critical' || item.status === 'needs_attention') && (
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateTask(item)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Plano de Ação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ReportLayout>
  );
};

export default RelatorioExecutivo;