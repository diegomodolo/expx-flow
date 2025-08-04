import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useClients } from "@/hooks/useClients";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { 
  Play, 
  Pause, 
  AlertCircle, 
  TrendingUp,
  AlertTriangle,
  Target,
  Plus,
  CheckCircle
} from "lucide-react";

interface CampaignAnalysis {
  id: string;
  name: string;
  platforms: string;
  status: string;
  spend: number;
  conversions: number;
  ctr: number;
  cpa: number;
  client_name?: string;
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  efficiency: number;
}

const RelatorioCampanhas = () => {
  const { campaignRankings } = useDashboardData();
  const { campaigns } = useCampaigns();
  const { clients } = useClients();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [campaignsAnalysis, setCampaignsAnalysis] = useState<CampaignAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<CampaignAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-analise',
      label: 'Status de Análise',
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
      id: 'cliente',
      label: 'Cliente',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os clientes' },
        ...clients.map(client => ({ value: client.id, label: client.name }))
      ],
      placeholder: 'Todos os clientes'
    },
    {
      id: 'status-campanha',
      label: 'Status da Campanha',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'active', label: 'Ativas' },
        { value: 'paused', label: 'Pausadas' },
        { value: 'finished', label: 'Finalizadas' }
      ],
      placeholder: 'Todos os status'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os problemas' },
        { value: 'ctr_baixo', label: 'CTR Baixo' },
        { value: 'cpa_alto', label: 'CPA Alto' },
        { value: 'sem_conversoes', label: 'Sem Conversões' },
        { value: 'pausada', label: 'Campanha Pausada' }
      ],
      placeholder: 'Todos os problemas'
    },
    {
      id: 'investimento-minimo',
      label: 'Investimento Mínimo',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os investimentos' },
        { value: '1000', label: 'R$ 1.000+' },
        { value: '5000', label: 'R$ 5.000+' },
        { value: '10000', label: 'R$ 10.000+' }
      ],
      placeholder: 'Todos os investimentos'
    }
  ];

  const analyzeCampaigns = () => {
    // Filtrar apenas campanhas ativas
    const activeCampaigns = campaigns.filter(campaign => campaign.status === 'active');
    
    const analysis: CampaignAnalysis[] = activeCampaigns.map(campaign => {
      // Identificar problemas
      const issues: string[] = [];
      if (campaign.ctr < 1.5) issues.push(`CTR baixo: ${campaign.ctr.toFixed(2)}%`);
      if (campaign.cpa > 100) issues.push(`CPA alto: R$ ${campaign.cpa.toFixed(2)}`);
      if (campaign.conversions === 0) issues.push('Nenhuma conversão registrada');
      if (campaign.status === 'paused') issues.push('Campanha pausada');
      if (campaign.spend > 5000 && campaign.conversions < 10) issues.push('Alto investimento com poucas conversões');

      // Calcular eficiência
      const efficiency = campaign.ctr > 0 && campaign.cpa > 0 
        ? Math.round((campaign.ctr / campaign.cpa) * 1000) 
        : 0;

      // Determinar status
      const analysisStatus: CampaignAnalysis['analysisStatus'] = 
        (campaign.ctr < 1 || campaign.cpa > 150 || campaign.conversions === 0) ? 'critical' :
        (campaign.ctr < 1.5 || campaign.cpa > 100 || issues.length >= 2) ? 'needs_attention' :
        (campaign.ctr > 2 && campaign.cpa < 50) ? 'excellent' : 'good';

      // Gerar recomendações
      const recommendations: string[] = [];
      if (campaign.ctr < 1.5) recommendations.push('Otimizar criativos para aumentar CTR');
      if (campaign.cpa > 100) recommendations.push('Revisar audiência e estratégia de lances');
      if (campaign.conversions === 0) recommendations.push('Verificar tracking e pixel de conversão');
      if (campaign.status === 'paused') recommendations.push('Analisar motivo da pausa e reativar se possível');
      if (efficiency < 20) recommendations.push('Revisar estratégia geral da campanha');

      return {
        id: campaign.id,
        name: campaign.name,
        platforms: campaign.platforms,
        status: campaign.status,
        spend: campaign.spend,
        conversions: campaign.conversions,
        ctr: campaign.ctr,
        cpa: campaign.cpa,
        client_name: 'Cliente',
        analysisStatus,
        issues,
        recommendations,
        efficiency
      };
    });

    setCampaignsAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = campaignsAnalysis;

    // Filtro por status de análise
    if (newFilters['status-analise'] && newFilters['status-analise'] !== 'todos') {
      filtered = filtered.filter(campaign => campaign.analysisStatus === newFilters['status-analise']);
    }

    // Filtro por cliente
    if (newFilters['cliente'] && newFilters['cliente'] !== 'todos') {
      filtered = filtered.filter(campaign => campaign.client_name?.includes(newFilters['cliente']));
    }

    // Filtro por status da campanha
    if (newFilters['status-campanha'] && newFilters['status-campanha'] !== 'todos') {
      filtered = filtered.filter(campaign => campaign.status === newFilters['status-campanha']);
    }

    // Filtro por tipo de problema
    if (newFilters['tipo-problema'] && newFilters['tipo-problema'] !== 'todos') {
      const problemMap: Record<string, string> = {
        'ctr_baixo': 'CTR baixo',
        'cpa_alto': 'CPA alto',
        'sem_conversoes': 'Nenhuma conversão',
        'pausada': 'pausada'
      };
      const problemText = problemMap[newFilters['tipo-problema']];
      if (problemText) {
        filtered = filtered.filter(campaign => campaign.issues.some(issue => issue.includes(problemText)));
      }
    }

    // Filtro por investimento mínimo
    if (newFilters['investimento-minimo'] && newFilters['investimento-minimo'] !== 'todos') {
      const minInvestment = parseInt(newFilters['investimento-minimo']);
      filtered = filtered.filter(campaign => campaign.spend >= minInvestment);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (campaign: CampaignAnalysis) => {
    const taskTitle = `Otimizar campanha: ${campaign.name}`;
    const taskDescription = `Problemas: ${campaign.issues.join(', ')}. Recomendações: ${campaign.recommendations.join(', ')}`;
    
    await convertAlertToTask({
      title: taskTitle,
      description: taskDescription,
      priority: campaign.analysisStatus === 'critical' ? 'high' : 'medium',
      type: 'optimization'
    });
  };

  const getStatusColor = (status: CampaignAnalysis['analysisStatus']) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_attention': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: CampaignAnalysis['analysisStatus']) => {
    const variants = {
      excellent: 'default',
      good: 'secondary',
      needs_attention: 'outline',
      critical: 'destructive'
    } as const;

    const labels = {
      excellent: 'Excelente',
      good: 'Bom',
      needs_attention: 'Precisa de Atenção',
      critical: 'Crítico'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getStatusIcon = (status: CampaignAnalysis['analysisStatus']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good': return <Target className="w-4 h-4 text-blue-600" />;
      case 'needs_attention': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Play className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCampaignStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCampaignStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paused: 'outline',
      finished: 'secondary'
    } as const;

    const labels = {
      active: 'Ativa',
      paused: 'Pausada',
      finished: 'Finalizada'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  useEffect(() => {
    if (campaigns.length > 0) {
      analyzeCampaigns();
    }
  }, [campaigns]);

  useEffect(() => {
    setFilteredData(campaignsAnalysis);
  }, [campaignsAnalysis]);

  // Métricas de resumo baseadas nos dados filtrados
  const filteredMetrics = {
    totalCampaigns: filteredData.length,
    criticalCampaigns: filteredData.filter(c => c.analysisStatus === 'critical').length,
    totalSpend: filteredData.reduce((acc, c) => acc + c.spend, 0),
    avgCPA: filteredData.length > 0 
      ? filteredData.reduce((acc, c) => acc + c.cpa, 0) / filteredData.length
      : 0
  };

  return (
    <ReportLayout
      title="Relatório de Campanhas"
      description="Análise detalhada de performance e otimização de campanhas publicitárias"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Use os filtros para analisar campanhas específicas e identificar oportunidades de otimização"
    >
      {/* Métricas de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Campanhas"
          value={filteredMetrics.totalCampaigns}
          subtitle="Campanhas analisadas"
        />
        <MetricCard
          title="Campanhas Críticas"
          value={filteredMetrics.criticalCampaigns}
          trend={filteredMetrics.criticalCampaigns > 0 ? "down" : "up"}
          subtitle="Precisam de atenção imediata"
        />
        <MetricCard
          title="Investimento Total"
          value={`R$ ${filteredMetrics.totalSpend.toLocaleString()}`}
          subtitle="Investimento analisado"
        />
        <MetricCard
          title="CPA Médio"
          value={`R$ ${filteredMetrics.avgCPA.toFixed(2)}`}
          trend={filteredMetrics.avgCPA <= 80 ? "up" : "down"}
          subtitle="Custo por aquisição"
        />
      </div>

      {/* Lista de campanhas analisadas */}
      <div className="grid gap-4">
        {filteredData.length > 0 ? (
          filteredData.map((campaign) => {
            const statusColor = campaign.analysisStatus === 'critical' ? 'border-l-destructive' :
                               campaign.analysisStatus === 'needs_attention' ? 'border-l-yellow-500' :
                               campaign.analysisStatus === 'good' ? 'border-l-blue-500' : 'border-l-green-500';
            
            return (
              <Card key={campaign.id} className={`border-l-4 ${statusColor}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(campaign.analysisStatus)}
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {campaign.platforms} • {campaign.client_name || 'Cliente não especificado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.analysisStatus)}
                        {getCampaignStatusBadge(campaign.status)}
                        <Badge variant="outline">
                          Score: {campaign.efficiency}/100
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(campaign.analysisStatus === 'critical' || campaign.analysisStatus === 'needs_attention') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateTask(campaign)}
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
                  {campaign.issues.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-destructive">Problemas Identificados:</h4>
                      <ul className="space-y-1">
                        {campaign.issues.map((issue, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendação */}
                  {campaign.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Recomendação:</h4>
                      <p className="text-sm bg-primary/10 p-3 rounded-lg">
                        {campaign.recommendations[0]}
                      </p>
                    </div>
                  )}

                  {/* Métricas Detalhadas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        R$ {campaign.spend.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Investimento Total
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {campaign.conversions}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Conversões
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${campaign.ctr >= 1.5 ? 'text-green-600' : 'text-destructive'}`}>
                        {campaign.ctr.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        CTR (Meta: &gt;1.5%)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${campaign.cpa <= 100 ? 'text-green-600' : 'text-destructive'}`}>
                        R$ {campaign.cpa.toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        CPA (Meta: &lt;R$ 100)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma campanha encontrada
              </h3>
              <p className="text-muted-foreground">
                Ajuste os filtros para ver mais resultados ou verifique se há campanhas cadastradas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ReportLayout>
  );
};

export default RelatorioCampanhas;