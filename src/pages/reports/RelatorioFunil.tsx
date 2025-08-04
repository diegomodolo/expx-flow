import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { Users, MousePointer, Target, Repeat, AlertTriangle, Plus, TrendingDown } from "lucide-react";

interface FunnelStageAnalysis {
  id: string;
  stage: string;
  stageName: string;
  volume: number;
  conversionRate: number;
  cost: number;
  cpl: number;
  efficiency: string;
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  dropoffRate: number;
}

const RelatorioFunil = () => {
  const { funnelMetrics, campaignRankings } = useDashboardData();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [funnelAnalysis, setFunnelAnalysis] = useState<FunnelStageAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<FunnelStageAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-eficiencia',
      label: 'Status de Eficiência',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'critical', label: 'Crítico' },
        { value: 'needs_attention', label: 'Precisa Atenção' },
        { value: 'good', label: 'Bom' },
        { value: 'excellent', label: 'Excelente' }
      ],
      placeholder: 'Todos os status'
    },
    {
      id: 'etapa-funil',
      label: 'Etapa do Funil',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as etapas' },
        { value: 'topo', label: 'Topo (Awareness)' },
        { value: 'meio', label: 'Meio (Consideration)' },
        { value: 'fundo', label: 'Fundo (Conversion)' },
        { value: 'retencao', label: 'Retenção' }
      ],
      placeholder: 'Todas as etapas'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'conversao-minima',
      label: 'Conversão Mínima',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as conversões' },
        { value: '5', label: '5%+' },
        { value: '10', label: '10%+' },
        { value: '15', label: '15%+' }
      ],
      placeholder: 'Todas as conversões'
    }
  ];

  const analyzeFunnel = () => {
    if (!funnelMetrics) return;

    const stages = [
      {
        id: 'topo',
        stage: 'topo',
        stageName: 'Topo (Awareness)',
        volume: funnelMetrics.reach || 0,
        cost: (funnelMetrics.reach || 0) * 0.01,
        icon: Users
      },
      {
        id: 'meio',
        stage: 'meio',
        stageName: 'Meio (Consideration)',
        volume: funnelMetrics.clicks || 0,
        cost: (funnelMetrics.clicks || 0) * 0.5,
        icon: MousePointer
      },
      {
        id: 'fundo',
        stage: 'fundo',
        stageName: 'Fundo (Conversion)',
        volume: funnelMetrics.leads || 0,
        cost: (funnelMetrics.leads || 0) * (funnelMetrics.cpl || 0),
        icon: Target
      },
      {
        id: 'retencao',
        stage: 'retencao',
        stageName: 'Retenção',
        volume: Math.floor((funnelMetrics.leads || 0) * 0.7),
        cost: Math.floor((funnelMetrics.leads || 0) * 0.7) * 50,
        icon: Repeat
      }
    ];

    const analysis: FunnelStageAnalysis[] = stages.map((stage, index) => {
      const prevStage = index > 0 ? stages[index - 1] : null;
      const conversionRate = prevStage ? (stage.volume / prevStage.volume * 100) : 100;
      const dropoffRate = 100 - conversionRate;
      const cpl = stage.volume > 0 ? stage.cost / stage.volume : 0;
      
      // Identificar problemas
      const issues: string[] = [];
      if (conversionRate < 5 && index > 0) issues.push(`Taxa de conversão baixa: ${conversionRate.toFixed(1)}%`);
      if (dropoffRate > 80 && index > 0) issues.push(`Alto índice de abandono: ${dropoffRate.toFixed(1)}%`);
      if (cpl > 100 && index === 2) issues.push(`CPL alto: R$ ${cpl.toFixed(2)}`);
      
      // Determinar status
      const analysisStatus: FunnelStageAnalysis['analysisStatus'] = 
        conversionRate < 3 && index > 0 ? 'critical' :
        conversionRate < 8 && index > 0 ? 'needs_attention' :
        conversionRate > 15 ? 'excellent' : 'good';

      // Gerar recomendações
      const recommendations: string[] = [];
      if (conversionRate < 5 && index === 1) recommendations.push('Melhorar criativos para aumentar CTR');
      if (conversionRate < 5 && index === 2) recommendations.push('Otimizar landing pages e formulários');
      if (dropoffRate > 70) recommendations.push('Revisar jornada do usuário nesta etapa');
      if (cpl > 80) recommendations.push('Melhorar segmentação de audiência');

      const efficiency = conversionRate > 15 ? 'Excelente' : 
                        conversionRate > 10 ? 'Boa' : 
                        conversionRate > 5 ? 'Regular' : 'Crítica';

      return {
        id: stage.id,
        stage: stage.stage,
        stageName: stage.stageName,
        volume: stage.volume,
        conversionRate: Math.round(conversionRate * 100) / 100,
        cost: stage.cost,
        cpl: Math.round(cpl * 100) / 100,
        efficiency,
        analysisStatus,
        issues,
        recommendations,
        dropoffRate: Math.round(dropoffRate * 100) / 100
      };
    });

    setFunnelAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = funnelAnalysis;

    if (newFilters['status-eficiencia'] && newFilters['status-eficiencia'] !== 'todos') {
      filtered = filtered.filter(stage => stage.analysisStatus === newFilters['status-eficiencia']);
    }

    if (newFilters['etapa-funil'] && newFilters['etapa-funil'] !== 'todas') {
      filtered = filtered.filter(stage => stage.stage === newFilters['etapa-funil']);
    }

    if (newFilters['conversao-minima'] && newFilters['conversao-minima'] !== 'todas') {
      const minConversion = parseInt(newFilters['conversao-minima']);
      filtered = filtered.filter(stage => stage.conversionRate >= minConversion);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (stage: FunnelStageAnalysis) => {
    await convertAlertToTask({
      title: `Otimizar ${stage.stageName}`,
      description: `Problemas: ${stage.issues.join(', ')}. Recomendações: ${stage.recommendations.join(', ')}`,
      priority: stage.analysisStatus === 'critical' ? 'high' : 'medium',
      type: 'optimization'
    });
  };

  const getStatusBadge = (status: FunnelStageAnalysis['analysisStatus']) => {
    const variants = { excellent: 'default', good: 'secondary', needs_attention: 'outline', critical: 'destructive' } as const;
    const labels = { excellent: 'Excelente', good: 'Bom', needs_attention: 'Precisa Atenção', critical: 'Crítico' };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  useEffect(() => {
    if (funnelMetrics) {
      analyzeFunnel();
    }
  }, [funnelMetrics]);

  useEffect(() => {
    setFilteredData(funnelAnalysis);
  }, [funnelAnalysis]);

  if (!funnelMetrics) {
    return (
      <ReportLayout title="Relatório de Funil Completo" description="Carregando análise do funil...">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ReportLayout>
    );
  }

  const filteredMetrics = {
    totalStages: filteredData.length,
    criticalStages: filteredData.filter(s => s.analysisStatus === 'critical').length,
    avgConversion: filteredData.length > 0 ? filteredData.reduce((acc, s) => acc + s.conversionRate, 0) / filteredData.length : 0,
    totalCost: filteredData.reduce((acc, s) => acc + s.cost, 0)
  };

  return (
    <ReportLayout
      title="Relatório de Funil Completo"
      description="Análise detalhada de conversão e otimização do funil"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Etapas Analisadas"
          value={filteredMetrics.totalStages}
          subtitle="Total do funil"
        />
        <MetricCard
          title="Etapas Críticas"
          value={filteredMetrics.criticalStages}
          trend={filteredMetrics.criticalStages > 0 ? "down" : "up"}
          subtitle="Precisam otimização"
        />
        <MetricCard
          title="Conversão Média"
          value={`${filteredMetrics.avgConversion.toFixed(1)}%`}
          trend={filteredMetrics.avgConversion >= 10 ? "up" : "down"}
          subtitle="Entre etapas"
        />
        <MetricCard
          title="Custo Total"
          value={`R$ ${filteredMetrics.totalCost.toLocaleString()}`}
          subtitle="Investimento no funil"
        />
      </div>

      <div className="space-y-4">
        {filteredData.map((stage) => (
          <Card key={stage.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{stage.stageName}</CardTitle>
                  <CardDescription>
                    {stage.volume.toLocaleString()} usuários • {stage.conversionRate}% conversão
                  </CardDescription>
                </div>
                {getStatusBadge(stage.analysisStatus)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {stage.issues.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Problemas Identificados
                  </h4>
                  <ul className="space-y-1">
                    {stage.issues.map((issue, index) => (
                      <li key={index} className="text-sm text-destructive flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-destructive" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stage.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Recomendações
                  </h4>
                  <ul className="space-y-1">
                    {stage.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{stage.volume.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Volume</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${stage.conversionRate >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {stage.conversionRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">Conversão</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">R$ {stage.cost.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Custo</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">R$ {stage.cpl.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">CPL</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{stage.efficiency}</div>
                  <div className="text-xs text-muted-foreground">Eficiência</div>
                </div>
              </div>

              {(stage.analysisStatus === 'critical' || stage.analysisStatus === 'needs_attention') && (
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateTask(stage)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Otimizar Etapa
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

export default RelatorioFunil;