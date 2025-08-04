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
    // Filtrar apenas clientes com investimento ativo (> 0)
    const activeClients = clientsPerformance.filter(client => client.investment > 0);
    
    const analysis: ClientAnalysis[] = activeClients.map(client => {
      // Usar dados REAIS ao invés de simulados
      const realLeads = client.totalLeads || client.leads_generated || 0;
      const realInvestment = client.totalInvestment || client.investment || 0;
      const realCPA = client.averageCPA || client.avg_cpl || (realInvestment > 0 && realLeads > 0 ? realInvestment / realLeads : 0);
      
      // Calcular eficiência baseada em dados reais
      const efficiency = realInvestment > 0 ? (realLeads / realInvestment * 1000) : 0;
      const roi = realInvestment > 0 ? (realLeads * 100) / realInvestment : 0; // Assumindo valor médio de R$100 por lead

      // Identificar problemas baseados em dados reais
      const issues: string[] = [];
      if (efficiency < 10) issues.push('ROI baixo para o investimento atual');
      if (realCPA > 120) issues.push(`CPA muito alto: R$ ${realCPA.toFixed(2)}`);
      if (realLeads < 5 && realInvestment > 3000) issues.push('Poucos leads para o investimento realizado');
      if (roi < 50) issues.push('Retorno do investimento insatisfatório');
      if (realLeads === 0 && realInvestment > 0) issues.push('Nenhum lead gerado com investimento ativo');

      // Determinar status baseado em dados reais
      const analysisStatus: ClientAnalysis['analysisStatus'] = 
        efficiency < 5 || roi < 30 ? 'critical' :
        efficiency < 10 || issues.length >= 2 ? 'needs_attention' :
        efficiency > 20 && roi > 100 ? 'excellent' : 'good';

      // Gerar recomendações baseadas em dados reais
      const recommendations: string[] = [];
      if (efficiency < 10) recommendations.push('Revisar estratégia de marketing e otimizar campanhas');
      if (realCPA > 120) recommendations.push('Melhorar segmentação e criativos para reduzir CPA');
      if (realLeads < 5) recommendations.push('Aumentar investimento ou melhorar funil de conversão');
      if (roi < 50) recommendations.push('Reavaliar estratégia completa do cliente');
      if (realLeads === 0) recommendations.push('Urgente: Investigar por que não há conversões');

      return {
        id: client.id || client.name,
        name: client.name,
        investment: realInvestment,
        leads: realLeads,
        cpa: realCPA,
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

  const getStatusIcon = (status: ClientAnalysis['analysisStatus']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'needs_attention': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <TrendingDown className="w-5 h-5 text-red-600" />;
      default: return <User className="w-5 h-5 text-gray-600" />;
    }
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

      <div className="grid gap-4">
        {filteredData.map((client) => {
          const statusColor = client.analysisStatus === 'critical' ? 'border-l-destructive' :
                             client.analysisStatus === 'needs_attention' ? 'border-l-yellow-500' :
                             client.analysisStatus === 'good' ? 'border-l-blue-500' : 'border-l-green-500';
          
          return (
            <Card key={client.id} className={`border-l-4 ${statusColor}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(client.analysisStatus)}
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Cliente ativo • ROI: {client.roi}x
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(client.analysisStatus)}
                      <Badge variant="outline">
                        Eficiência: {client.efficiency}/100
                      </Badge>
                      <Badge variant="outline">
                        {client.leads} leads gerados
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(client.analysisStatus === 'critical' || client.analysisStatus === 'needs_attention') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTask(client)}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Criar Tarefa
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Problemas Identificados */}
                {client.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-destructive">Problemas Identificados:</h4>
                    <ul className="space-y-1">
                      {client.issues.map((issue, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <TrendingDown className="w-4 h-4 text-destructive" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recomendação */}
                {client.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary">Recomendação:</h4>
                    <p className="text-sm bg-primary/10 p-3 rounded-lg">
                      {client.recommendations[0]}
                    </p>
                  </div>
                )}

                {/* Métricas Detalhadas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      R$ {client.investment.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Investimento Total
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {client.leads}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Leads Gerados
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${client.cpa <= 120 ? 'text-green-600' : 'text-destructive'}`}>
                      R$ {client.cpa.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CPA (Meta: &lt;R$ 120)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${client.roi >= 1 ? 'text-green-600' : 'text-destructive'}`}>
                      {client.roi}x
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ROI (Meta: &gt;1x)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ReportLayout>
  );
};

export default RelatorioPerformanceCliente;