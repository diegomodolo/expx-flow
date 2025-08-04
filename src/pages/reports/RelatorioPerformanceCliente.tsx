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
  leadsPerThousand: number; // leads por R$ 1000 investidos
  healthScore: number; // nota de saúde de 0 a 100
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
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
        { value: 'cpa_alto', label: 'CPA Alto' },
        { value: 'poucos_leads', label: 'Poucos Leads' },
        { value: 'sem_leads', label: 'Sem Leads' }
      ],
      placeholder: 'Todos os problemas'
    }
  ];

  const analyzeClients = () => {
    // Incluir TODOS os clientes (com e sem investimento)
    const allClients = clientsPerformance;
    
    const analysis: ClientAnalysis[] = allClients.map(client => {
      // Usar dados REAIS ao invés de simulados
      const realLeads = client.totalLeads || client.leads_generated || 0;
      const realInvestment = client.totalInvestment || client.investment || 0;
      const realCPA = client.averageCPA || client.avg_cpl || (realInvestment > 0 && realLeads > 0 ? realInvestment / realLeads : 0);
      
      // Calcular leads por R$ 1000 investidos
      const leadsPerThousand = realInvestment > 0 ? (realLeads / realInvestment * 1000) : 0;

      // Calcular nota de saúde de 0 a 100
      const calculateHealthScore = () => {
        let score = 50; // Base score

        // Pontuação baseada no CPA (40 pontos máximo)
        if (realCPA === 0 && realLeads === 0) {
          score -= 40; // Sem leads nem CPA = muito ruim
        } else if (realCPA <= 60) {
          score += 40; // CPA excelente
        } else if (realCPA <= 90) {
          score += 25; // CPA bom
        } else if (realCPA <= 120) {
          score += 10; // CPA aceitável
        } else if (realCPA <= 150) {
          score -= 10; // CPA alto
        } else {
          score -= 30; // CPA muito alto
        }

        // Pontuação baseada em leads por R$1000 (30 pontos máximo)
        if (leadsPerThousand >= 15) {
          score += 30; // Excelente volume
        } else if (leadsPerThousand >= 10) {
          score += 20; // Bom volume
        } else if (leadsPerThousand >= 6) {
          score += 10; // Volume razoável
        } else if (leadsPerThousand >= 3) {
          score -= 5; // Volume baixo
        } else {
          score -= 20; // Volume muito baixo
        }

        // Pontuação baseada no volume absoluto de leads (20 pontos máximo)
        if (realLeads >= 50) {
          score += 20;
        } else if (realLeads >= 20) {
          score += 15;
        } else if (realLeads >= 10) {
          score += 10;
        } else if (realLeads >= 5) {
          score += 5;
        } else if (realLeads === 0) {
          score -= 20;
        }

        return Math.max(0, Math.min(100, Math.round(score)));
      };

      const healthScore = calculateHealthScore();

      // Identificar problemas baseados em leads e CPA
      const issues: string[] = [];
      
      // Clientes sem investimento (inativos)
      if (realInvestment === 0) {
        issues.push('Cliente inativo - sem campanhas em execução');
        issues.push('Nenhum investimento registrado no período');
      } else {
        // Clientes com investimento ativo
        if (leadsPerThousand < 8) issues.push('Poucos leads por investimento (meta: 8+ leads/R$1000)');
        if (realCPA > 120) issues.push(`CPA muito alto: R$ ${realCPA.toFixed(2)} (meta: <R$120)`);
        if (realLeads < 5 && realInvestment > 3000) issues.push('Volume de leads insuficiente para o investimento');
        if (realLeads === 0 && realInvestment > 0) issues.push('Nenhum lead gerado com investimento ativo');
      }

      // Determinar status baseado em leads e CPA
      const analysisStatus: ClientAnalysis['analysisStatus'] = 
        realInvestment === 0 ? 'critical' : // Clientes inativos são sempre críticos
        realLeads === 0 || realCPA > 150 ? 'critical' :
        realCPA > 120 || leadsPerThousand < 5 ? 'needs_attention' :
        realCPA <= 80 && leadsPerThousand >= 12 ? 'excellent' : 'good';

      // Gerar recomendações focadas em leads e CPA
      const recommendations: string[] = [];
      
      if (realInvestment === 0) {
        recommendations.push('URGENTE: Reativar cliente - criar estratégia de campanhas');
        recommendations.push('Agendar reunião para entender necessidades atuais');
        recommendations.push('Desenvolver proposta comercial personalizada');
      } else {
        if (realCPA > 120) recommendations.push('Otimizar campanhas para reduzir CPA: revisar segmentação e criativos');
        if (leadsPerThousand < 8) recommendations.push('Melhorar eficiência: aumentar volume de leads por real investido');
        if (realLeads === 0) recommendations.push('URGENTE: Investigar campanhas - sem conversões detectadas');
        if (realLeads < 10 && realInvestment > 5000) recommendations.push('Escalar investimento ou revisar funil de conversão');
      }

      return {
        id: client.id || client.name,
        name: client.name,
        investment: realInvestment,
        leads: realLeads,
        cpa: realCPA,
        leadsPerThousand: Math.round(leadsPerThousand * 10) / 10,
        healthScore,
        analysisStatus,
        issues,
        recommendations
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
    avgCPA: filteredData.length > 0 ? filteredData.reduce((acc, c) => acc + c.cpa, 0) / filteredData.length : 0
  };

  return (
    <ReportLayout
      title="Relatório de Performance por Cliente"
      description="Análise detalhada de leads e CPA por cliente"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total de Clientes" value={filteredMetrics.totalClients} />
        <MetricCard title="Clientes Críticos" value={filteredMetrics.criticalClients} trend={filteredMetrics.criticalClients > 0 ? "down" : "up"} />
        <MetricCard title="Investimento Total" value={`R$ ${filteredMetrics.totalInvestment.toLocaleString()}`} />
        <MetricCard title="CPA Médio" value={`R$ ${filteredMetrics.avgCPA.toFixed(0)}`} trend={filteredMetrics.avgCPA <= 120 ? "up" : "down"} />
      </div>

      <div className="grid gap-4">
        {filteredData
          .sort((a, b) => {
            // Ordenar primeiro por status (melhor para pior)
            const statusOrder = { excellent: 4, good: 3, needs_attention: 2, critical: 1 };
            const statusDiff = statusOrder[b.analysisStatus] - statusOrder[a.analysisStatus];
            
            // Se status igual, ordenar por leads per thousand (maior para menor)
            if (statusDiff === 0) {
              return b.leadsPerThousand - a.leadsPerThousand;
            }
            
            return statusDiff;
          })
          .map((client, index) => {
          const statusColor = client.analysisStatus === 'critical' ? 'border-l-destructive' :
                             client.analysisStatus === 'needs_attention' ? 'border-l-yellow-500' :
                             client.analysisStatus === 'good' ? 'border-l-blue-500' : 'border-l-green-500';
          
          return (
            <Card key={client.id} className={`border-l-4 ${statusColor}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                     <div className="flex items-center gap-3">
                       <div className="flex items-center gap-2">
                         <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-bold">
                           #{index + 1}
                         </div>
                         {getStatusIcon(client.analysisStatus)}
                       </div>
                        <div>
                           <CardTitle className="text-lg">{client.name}</CardTitle>
                           <p className="text-sm text-muted-foreground">
                             {client.investment > 0 ? 
                               `Cliente ativo • CPA: R$ ${client.cpa.toFixed(0)}` : 
                               'Cliente inativo • Sem campanhas'
                             }
                           </p>
                        </div>
                     </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(client.analysisStatus)}
                       <Badge variant="outline">
                         {client.leadsPerThousand} leads/R$1000
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
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                   <div className="text-center">
                     <div className={`text-2xl font-bold ${
                       client.healthScore >= 80 ? 'text-green-600' :
                       client.healthScore >= 60 ? 'text-blue-600' :
                       client.healthScore >= 40 ? 'text-yellow-600' : 'text-destructive'
                     }`}>
                       {client.healthScore}/100
                     </div>
                     <div className="text-xs text-muted-foreground">
                       Nota de Saúde
                     </div>
                   </div>
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