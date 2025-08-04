import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useClients } from "@/hooks/useClients";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Plus,
  CheckCircle,
  User
} from "lucide-react";

interface ClientAnalysis {
  id: string;
  name: string;
  investment: number;
  leads: number;
  cpa: number;
  efficiency: number;
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  roi: number;
}

const RelatorioPerformanceCliente = () => {
  const { clientsPerformance } = useDashboardData();
  const { clients } = useClients();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [clientsAnalysis, setClientsAnalysis] = useState<ClientAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<ClientAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-analise',
      label: 'Status de Performance',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'critical', label: 'Crítico' },
        { value: 'needs_attention', label: 'Precisa de Atenção' },
        { value: 'good', label: 'Bom' },
        { value: 'excellent', label: 'Excelente' }
      ],
      placeholder: 'Todos os status'
    },
    {
      id: 'faturamento-minimo',
      label: 'Faturamento Mínimo',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os faturamentos' },
        { value: '5000', label: 'R$ 5.000+' },
        { value: '10000', label: 'R$ 10.000+' },
        { value: '25000', label: 'R$ 25.000+' }
      ],
      placeholder: 'Todos os faturamentos'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os problemas' },
        { value: 'roi_baixo', label: 'ROI Baixo' },
        { value: 'cpa_alto', label: 'CPA Alto' },
        { value: 'poucos_leads', label: 'Poucos Leads' }
      ],
      placeholder: 'Todos os problemas'
    }
  ];

  const analyzeClients = () => {
    const analysis: ClientAnalysis[] = clientsPerformance.map(client => {
      const simulatedLeads = Math.floor(client.investment / 60);
      const simulatedCPA = client.investment / simulatedLeads || 0;
      const efficiency = client.investment > 0 ? (simulatedLeads / client.investment * 1000) : 0;
      const roi = simulatedLeads / (client.investment / 1000);

      // Identificar problemas
      const issues: string[] = [];
      if (efficiency < 10) issues.push('ROI baixo');
      if (simulatedCPA > 120) issues.push('CPA muito alto');
      if (simulatedLeads < 5 && client.investment > 3000) issues.push('Poucos leads para o investimento');
      if (roi < 0.5) issues.push('Retorno do investimento insatisfatório');

      // Determinar status
      const analysisStatus: ClientAnalysis['analysisStatus'] = 
        efficiency < 5 || roi < 0.3 ? 'critical' :
        efficiency < 10 || issues.length >= 2 ? 'needs_attention' :
        efficiency > 20 && roi > 1 ? 'excellent' : 'good';

      // Gerar recomendações
      const recommendations: string[] = [];
      if (efficiency < 10) recommendations.push('Revisar estratégia de marketing e otimizar campanhas');
      if (simulatedCPA > 120) recommendations.push('Melhorar segmentação e criativos');
      if (simulatedLeads < 5) recommendations.push('Aumentar investimento ou melhorar funil');
      if (roi < 0.5) recommendations.push('Reavaliar estratégia completa do cliente');

      return {
        id: client.name,
        name: client.name,
        investment: client.investment,
        leads: simulatedLeads,
        cpa: simulatedCPA,
        efficiency: Math.round(efficiency),
        analysisStatus,
        issues,
        recommendations,
        roi: Math.round(roi * 100) / 100
      };
    });

    setClientsAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = clientsAnalysis;

    if (newFilters['status-analise'] && newFilters['status-analise'] !== 'todos') {
      filtered = filtered.filter(client => client.analysisStatus === newFilters['status-analise']);
    }

    if (newFilters['faturamento-minimo'] && newFilters['faturamento-minimo'] !== 'todos') {
      const minRevenue = parseInt(newFilters['faturamento-minimo']);
      filtered = filtered.filter(client => client.investment >= minRevenue);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (client: ClientAnalysis) => {
    await convertAlertToTask({
      title: `Otimizar performance do cliente ${client.name}`,
      description: `Problemas: ${client.issues.join(', ')}. Recomendações: ${client.recommendations.join(', ')}`,
      priority: client.analysisStatus === 'critical' ? 'high' : 'medium',
      type: 'optimization'
    });
  };

  const getStatusBadge = (status: ClientAnalysis['analysisStatus']) => {
    const variants = { excellent: 'default', good: 'secondary', needs_attention: 'outline', critical: 'destructive' } as const;
    const labels = { excellent: 'Excelente', good: 'Bom', needs_attention: 'Precisa de Atenção', critical: 'Crítico' };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  useEffect(() => {
    if (clientsPerformance.length > 0) {
      analyzeClients();
    }
  }, [clientsPerformance]);

  useEffect(() => {
    setFilteredData(clientsAnalysis);
  }, [clientsAnalysis]);

  const filteredMetrics = {
    totalClients: filteredData.length,
    criticalClients: filteredData.filter(c => c.analysisStatus === 'critical').length,
    totalInvestment: filteredData.reduce((acc, c) => acc + c.investment, 0),
    avgROI: filteredData.length > 0 ? filteredData.reduce((acc, c) => acc + c.roi, 0) / filteredData.length : 0
  };

  return (
    <ReportLayout
      title="Relatório de Performance por Cliente"
      description="Análise detalhada de ROI e eficiência por cliente"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total de Clientes" value={filteredMetrics.totalClients} />
        <MetricCard title="Clientes Críticos" value={filteredMetrics.criticalClients} trend={filteredMetrics.criticalClients > 0 ? "down" : "up"} />
        <MetricCard title="Investimento Total" value={`R$ ${filteredMetrics.totalInvestment.toLocaleString()}`} />
        <MetricCard title="ROI Médio" value={`${filteredMetrics.avgROI.toFixed(2)}x`} trend={filteredMetrics.avgROI >= 1 ? "up" : "down"} />
      </div>

      <div className="space-y-4">
        {filteredData.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{client.name}</CardTitle>
                {getStatusBadge(client.analysisStatus)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.issues.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Problemas Identificados
                  </h4>
                  <ul className="space-y-1">
                    {client.issues.map((issue, index) => (
                      <li key={index} className="text-sm text-destructive flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-destructive" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {client.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Recomendações
                  </h4>
                  <ul className="space-y-1">
                    {client.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold">R$ {client.investment.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Investimento</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{client.leads}</div>
                  <div className="text-xs text-muted-foreground">Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">R$ {client.cpa.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">CPA</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{client.roi}x</div>
                  <div className="text-xs text-muted-foreground">ROI</div>
                </div>
              </div>
              {(client.analysisStatus === 'critical' || client.analysisStatus === 'needs_attention') && (
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleCreateTask(client)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Tarefa
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

export default RelatorioPerformanceCliente;