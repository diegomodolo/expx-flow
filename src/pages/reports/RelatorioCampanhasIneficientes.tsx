import { useState, useEffect } from "react";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Target, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useClients } from "@/hooks/useClients";

interface InefficientCampaign {
  id: string;
  name: string;
  client_name: string;
  investment: number;
  conversions: number;
  cpa_current: number;
  cpa_target: number;
  roas_current: number;
  roas_minimum: number;
  efficiency_score: number;
  efficiency_rank: number;
  days_running: number;
  recommendation: string;
  issues: string[];
}

export default function RelatorioCampanhasIneficientes() {
  const { campaigns, loading } = useCampaigns();
  const { clients } = useClients();
  const { convertAlertToTask } = useTaskAutomation();
  const [inefficientCampaigns, setInefficientCampaigns] = useState<InefficientCampaign[]>([]);
  const [filteredData, setFilteredData] = useState<InefficientCampaign[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && campaigns) {
      analyzeInefficientCampaigns();
    }
  }, [campaigns, loading]);

  useEffect(() => {
    setFilteredData(inefficientCampaigns);
  }, [inefficientCampaigns]);

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    
    let filtered = [...inefficientCampaigns];

    // Filtro por cliente
    if (newFilters.cliente && newFilters.cliente !== 'todos') {
      filtered = filtered.filter(item => item.client_name === newFilters.cliente);
    }

    // Filtro por nível de ineficiência
    if (newFilters['nivel-ineficiencia'] && newFilters['nivel-ineficiencia'] !== 'todos') {
      switch (newFilters['nivel-ineficiencia']) {
        case 'critica':
          filtered = filtered.filter(item => item.efficiency_score < 30);
          break;
        case 'baixa':
          filtered = filtered.filter(item => item.efficiency_score >= 30 && item.efficiency_score < 60);
          break;
        case 'moderada':
          filtered = filtered.filter(item => item.efficiency_score >= 60);
          break;
      }
    }

    // Filtro por plataforma
    if (newFilters.plataforma && newFilters.plataforma !== 'todas') {
      // Como não temos plataforma no modelo, vamos simular baseado em dados disponíveis
      // Em um cenário real, seria filtrado por campaign.platform
      filtered = filtered; // Manter todos por enquanto
    }

    // Filtro por CPA mínimo
    if (newFilters['cpa-minimo'] && newFilters['cpa-minimo'] !== 'sem-limite') {
      const minCPA = parseFloat(newFilters['cpa-minimo']);
      filtered = filtered.filter(item => item.cpa_current >= minCPA);
    }

    // Filtro por tipo de problema
    if (newFilters['tipo-problema'] && newFilters['tipo-problema'] !== 'todos') {
      const problemType = newFilters['tipo-problema'];
      filtered = filtered.filter(item => {
        switch (problemType) {
          case 'sem-conversao':
            return item.conversions === 0;
          case 'cpa-alto':
            return item.cpa_current > item.cpa_target;
          case 'roas-baixo':
            return item.roas_current < item.roas_minimum;
          case 'investimento-alto':
            return item.investment > 5000 && item.conversions < 5;
          default:
            return true;
        }
      });
    }

    // Filtro por período
    if (newFilters.periodo && newFilters.periodo !== 'todos') {
      const days = parseInt(newFilters.periodo);
      if (!isNaN(days)) {
        filtered = filtered.filter(item => item.days_running >= days);
      }
    }

    setFilteredData(filtered);
  };

  const analyzeInefficientCampaigns = () => {
    const inefficient: InefficientCampaign[] = [];

    campaigns?.forEach(campaign => {
      // Targets definidos (podem ser configuráveis por cliente)
      const cpaTarget = 150; // R$ 150 por conversão
      const roasMinimum = 3.0; // ROAS mínimo de 3:1

      const investment = campaign.spend || 0;
      const conversions = campaign.conversions || 0;
      const cpaCurrent = conversions > 0 ? investment / conversions : 0;
      
      // Simular valor das conversões (revenue)
      const avgOrderValue = 450; // Valor médio do pedido
      const revenue = conversions * avgOrderValue;
      const roasCurrent = investment > 0 ? revenue / investment : 0;

      // Calcular dias em execução (simulado)
      const daysRunning = Math.floor(Math.random() * 60) + 1;

      // Identificar problemas
      const issues: string[] = [];
      let efficiencyScore = 100;

      if (cpaCurrent > cpaTarget && conversions > 0) {
        issues.push(`CPA acima da meta (R$ ${cpaCurrent.toFixed(0)} vs R$ ${cpaTarget})`);
        efficiencyScore -= 30;
      }

      if (roasCurrent < roasMinimum && conversions > 0) {
        issues.push(`ROAS abaixo do mínimo (${roasCurrent.toFixed(1)}:1 vs ${roasMinimum}:1)`);
        efficiencyScore -= 30;
      }

      if (conversions === 0 && daysRunning > 7) {
        issues.push('Nenhuma conversão gerada');
        efficiencyScore -= 40;
      }

      if (investment > 5000 && conversions < 5) {
        issues.push('Alto investimento com poucas conversões');
        efficiencyScore -= 20;
      }

      // Só incluir campanhas com problemas
      if (issues.length === 0) return;

      // Gerar recomendação
      let recommendation = '';
      if (conversions === 0) {
        recommendation = 'Revisar completamente a estratégia de segmentação e criativos';
      } else if (cpaCurrent > cpaTarget * 1.5) {
        recommendation = 'Otimizar lances e melhorar qualidade dos leads';
      } else if (roasCurrent < roasMinimum * 0.5) {
        recommendation = 'Revisar landing page e processo de conversão';
      } else {
        recommendation = 'Ajustar segmentação e testar novos criativos';
      }

      inefficient.push({
        id: campaign.id,
        name: campaign.name,
        client_name: campaign.client?.name || 'Cliente não identificado',
        investment,
        conversions,
        cpa_current: cpaCurrent,
        cpa_target: cpaTarget,
        roas_current: roasCurrent,
        roas_minimum: roasMinimum,
        efficiency_score: Math.max(0, efficiencyScore),
        efficiency_rank: 0, // será definido após ordenação
        days_running: daysRunning,
        recommendation,
        issues
      });
    });

    // Ordenar por efficiency score (pior primeiro) e definir ranks
    const sorted = inefficient
      .sort((a, b) => a.efficiency_score - b.efficiency_score)
      .map((campaign, index) => ({
        ...campaign,
        efficiency_rank: index + 1
      }));

    setInefficientCampaigns(sorted);
  };

  const handleCreateTask = (campaign: InefficientCampaign) => {
    const alertData = {
      type: 'warning',
      description: `Campanha ineficiente: ${campaign.issues.join(', ')}`,
      campaign_id: campaign.id,
      client_id: undefined, // Será extraído do campaign_id no backend
      id: `inefficient_campaign_${campaign.id}`
    };

    convertAlertToTask(alertData);
  };

  const getEfficiencyColor = (score: number) => {
    if (score < 30) return 'text-destructive';
    if (score < 60) return 'text-warning';
    return 'text-success';
  };

  const getEfficiencyBadge = (score: number) => {
    if (score < 30) return { variant: 'destructive' as const, label: 'CRÍTICA' };
    if (score < 60) return { variant: 'secondary' as const, label: 'BAIXA' };
    return { variant: 'outline' as const, label: 'MODERADA' };
  };

  if (loading) {
    return (
      <ReportLayout
        title="Relatório de Campanhas Ineficientes"
        description="Campanhas que estão consumindo verba sem gerar resultados proporcionais"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </ReportLayout>
    );
  }

  // Usar dados filtrados para métricas quando há filtros ativos
  const dataToUse = Object.keys(activeFilters).length > 0 ? filteredData : inefficientCampaigns;
  
  const totalWastedBudget = dataToUse.reduce((sum, c) => sum + c.investment, 0);
  const avgEfficiencyScore = dataToUse.length > 0 
    ? dataToUse.reduce((sum, c) => sum + c.efficiency_score, 0) / dataToUse.length 
    : 0;
  const criticalCampaigns = dataToUse.filter(c => c.efficiency_score < 30).length;
  const top5Worst = dataToUse.slice(0, 5);

  // Preparar dados únicos para filtros
  const uniqueClients = Array.from(new Set(inefficientCampaigns.map(c => c.client_name)))
    .sort()
    .map(name => ({ value: name, label: name }));

  const primaryFilters: FilterConfig[] = [
    {
      id: 'cliente',
      label: 'Cliente',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os clientes' },
        ...uniqueClients
      ],
      placeholder: 'Todos os clientes'
    },
    {
      id: 'nivel-ineficiencia',
      label: 'Nível de Ineficiência',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os níveis' },
        { value: 'critica', label: 'Crítica (< 30)' },
        { value: 'baixa', label: 'Baixa (30-60)' },
        { value: 'moderada', label: 'Moderada (> 60)' }
      ],
      placeholder: 'Todos os níveis'
    },
    {
      id: 'plataforma',
      label: 'Plataforma',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as plataformas' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'google', label: 'Google Ads' },
        { value: 'instagram', label: 'Instagram' }
      ],
      placeholder: 'Todas as plataformas'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'cpa-minimo',
      label: 'CPA Mínimo',
      type: 'select',
      options: [
        { value: 'sem-limite', label: 'Sem limite' },
        { value: '100', label: 'R$ 100+' },
        { value: '200', label: 'R$ 200+' },
        { value: '300', label: 'R$ 300+' },
        { value: '500', label: 'R$ 500+' }
      ],
      placeholder: 'Sem limite'
    },
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'sem-conversao', label: 'Sem conversões' },
        { value: 'cpa-alto', label: 'CPA alto' },
        { value: 'roas-baixo', label: 'ROAS baixo' },
        { value: 'investimento-alto', label: 'Alto investimento' }
      ],
      placeholder: 'Todos os tipos'
    },
    {
      id: 'periodo',
      label: 'Período Mínimo (dias)',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os períodos' },
        { value: '7', label: '7+ dias' },
        { value: '15', label: '15+ dias' },
        { value: '30', label: '30+ dias' },
        { value: '60', label: '60+ dias' }
      ],
      placeholder: 'Todos os períodos'
    }
  ];

  return (
    <ReportLayout
      title="Relatório de Campanhas Ineficientes"
      description="Campanhas que estão consumindo verba sem gerar resultados proporcionais"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Configure os parâmetros para análise de campanhas ineficientes"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Campanhas Críticas"
            value={criticalCampaigns}
            trend={criticalCampaigns > 0 ? "down" : "neutral"}
            subtitle="Score < 30"
          />
          <MetricCard
            title="Verba Desperdiçada"
            value={`R$ ${totalWastedBudget.toLocaleString()}`}
            trend="down"
            subtitle="Total investido"
          />
          <MetricCard
            title="Score Médio"
            value={`${avgEfficiencyScore.toFixed(0)}/100`}
            trend={avgEfficiencyScore < 50 ? "down" : avgEfficiencyScore > 70 ? "up" : "neutral"}
            subtitle="Eficiência geral"
          />
          <MetricCard
            title="Total Ineficientes"
            value={dataToUse.length}
            subtitle="Campanhas identificadas"
          />
        </div>

        {/* Lista Detalhada de Campanhas */}
        <div className="grid gap-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma campanha ineficiente detectada</h3>
                <p className="text-muted-foreground">
                  {Object.keys(activeFilters).length > 0 
                    ? 'Nenhuma campanha corresponde aos filtros selecionados.'
                    : 'Todas as campanhas estão com performance dentro dos parâmetros esperados.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((campaign) => {
              const efficiencyBadge = getEfficiencyBadge(campaign.efficiency_score);
              
              return (
                <Card key={campaign.id} className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          <div>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {campaign.client_name} • {campaign.days_running} dias ativa
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={efficiencyBadge.variant}>
                            EFICIÊNCIA {efficiencyBadge.label}
                          </Badge>
                          <Badge variant="outline">
                            #{campaign.efficiency_rank} pior campanha
                          </Badge>
                          <Badge variant="outline">
                            Score: {campaign.efficiency_score}/100
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTask(campaign)}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Criar Tarefa
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Problemas Identificados */}
                    <div>
                      <h4 className="font-semibold mb-2 text-destructive">Problemas Identificados:</h4>
                      <ul className="space-y-1">
                        {campaign.issues.map((issue, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <TrendingDown className="w-4 h-4 text-destructive" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recomendação */}
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Recomendação:</h4>
                      <p className="text-sm bg-primary/10 p-3 rounded-lg">
                        {campaign.recommendation}
                      </p>
                    </div>

                    {/* Métricas Detalhadas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          R$ {campaign.investment.toLocaleString()}
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
                        <div className="text-2xl font-bold text-destructive">
                          R$ {campaign.cpa_current > 0 ? campaign.cpa_current.toFixed(0) : '0'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CPA (Meta: R$ {campaign.cpa_target})
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {campaign.roas_current.toFixed(1)}:1
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ROAS (Min: {campaign.roas_minimum}:1)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ReportLayout>
  );
}