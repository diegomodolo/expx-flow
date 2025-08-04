import { useState, useEffect } from "react";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AlertTriangle, Target, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";

interface BudgetDistribution {
  client_id: string;
  client_name: string;
  total_budget: number;
  current_distribution: {
    topo: number;
    meio: number;
    fundo: number;
    retencao: number;
  };
  recommended_distribution: {
    topo: number;
    meio: number;
    fundo: number;
    retencao: number;
  };
  imbalances: {
    stage: string;
    current_percent: number;
    recommended_percent: number;
    difference: number;
    status: 'excess' | 'deficit' | 'balanced';
  }[];
  severity_score: number;
  rebalance_suggestions: string[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];
const STAGE_NAMES = {
  topo: 'Topo do Funil',
  meio: 'Meio do Funil', 
  fundo: 'Fundo do Funil',
  retencao: 'Retenção'
};

export default function RelatorioOrcamentoMalDistribuido() {
  const { clients, loading: clientsLoading } = useClients();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetDistribution[]>([]);

  useEffect(() => {
    if (!clientsLoading && !campaignsLoading && clients && campaigns) {
      analyzeBudgetDistribution();
    }
  }, [clients, campaigns, clientsLoading, campaignsLoading]);

  const analyzeBudgetDistribution = () => {
    const analysis: BudgetDistribution[] = [];

    // Distribuição recomendada padrão
    const recommendedDistribution = {
      topo: 30,    // 30%
      meio: 30,    // 30%
      fundo: 30,   // 30%
      retencao: 10 // 10%
    };

    clients?.forEach(client => {
      const clientCampaigns = campaigns?.filter(c => c.client_id === client.id) || [];
      
      if (clientCampaigns.length === 0) return;

      const totalBudget = clientCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      
      if (totalBudget === 0) return;

      // Simular distribuição atual baseada no tipo de campanha
      // Na prática, isso viria de dados reais de categorização das campanhas
      const currentDistribution = simulateCurrentDistribution(clientCampaigns);
      
      // Calcular percentuais atuais
      const currentPercents = {
        topo: (currentDistribution.topo / totalBudget) * 100,
        meio: (currentDistribution.meio / totalBudget) * 100,
        fundo: (currentDistribution.fundo / totalBudget) * 100,
        retencao: (currentDistribution.retencao / totalBudget) * 100
      };

      // Identificar desequilíbrios
      const imbalances = Object.keys(recommendedDistribution).map(stage => {
        const stageKey = stage as keyof typeof recommendedDistribution;
        const currentPercent = currentPercents[stageKey];
        const recommendedPercent = recommendedDistribution[stageKey];
        const difference = currentPercent - recommendedPercent;
        
        let status: 'excess' | 'deficit' | 'balanced' = 'balanced';
        if (Math.abs(difference) > 10) { // Tolerância de 10%
          status = difference > 0 ? 'excess' : 'deficit';
        }

        return {
          stage: STAGE_NAMES[stageKey],
          current_percent: currentPercent,
          recommended_percent: recommendedPercent,
          difference,
          status
        };
      });

      // Calcular score de severidade (0-100, onde 100 é muito desbalanceado)
      const severityScore = imbalances.reduce((score, imbalance) => {
        return score + Math.abs(imbalance.difference);
      }, 0);

      // Gerar sugestões de reequilíbrio
      const suggestions = generateRebalanceSuggestions(imbalances, totalBudget);

      // Só incluir clientes com desequilíbrios significativos
      if (severityScore > 20) { // Threshold de 20 pontos
        analysis.push({
          client_id: client.id,
          client_name: client.name,
          total_budget: totalBudget,
          current_distribution: currentDistribution,
          recommended_distribution: {
            topo: (recommendedDistribution.topo / 100) * totalBudget,
            meio: (recommendedDistribution.meio / 100) * totalBudget,
            fundo: (recommendedDistribution.fundo / 100) * totalBudget,
            retencao: (recommendedDistribution.retencao / 100) * totalBudget
          },
          imbalances,
          severity_score: severityScore,
          rebalance_suggestions: suggestions
        });
      }
    });

    // Ordenar por severity score (pior primeiro)
    setBudgetAnalysis(analysis.sort((a, b) => b.severity_score - a.severity_score));
  };

  const simulateCurrentDistribution = (campaigns: any[]) => {
    // Simular distribuição baseada em características das campanhas
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    
    // Distribuição simulada (na prática viria de categorização real)
    return {
      topo: totalSpend * (0.2 + Math.random() * 0.4), // 20-60%
      meio: totalSpend * (0.1 + Math.random() * 0.3), // 10-40%
      fundo: totalSpend * (0.1 + Math.random() * 0.4), // 10-50%
      retencao: totalSpend * (0.05 + Math.random() * 0.2) // 5-25%
    };
  };

  const generateRebalanceSuggestions = (imbalances: any[], totalBudget: number): string[] => {
    const suggestions: string[] = [];
    
    const excesses = imbalances.filter(i => i.status === 'excess');
    const deficits = imbalances.filter(i => i.status === 'deficit');

    excesses.forEach(excess => {
      const amount = (Math.abs(excess.difference) / 100) * totalBudget;
      suggestions.push(
        `Reduzir orçamento em ${excess.stage} em R$ ${amount.toLocaleString()} (${Math.abs(excess.difference).toFixed(1)}%)`
      );
    });

    deficits.forEach(deficit => {
      const amount = (Math.abs(deficit.difference) / 100) * totalBudget;
      suggestions.push(
        `Aumentar orçamento em ${deficit.stage} em R$ ${amount.toLocaleString()} (${Math.abs(deficit.difference).toFixed(1)}%)`
      );
    });

    if (suggestions.length === 0) {
      suggestions.push('Distribuição está dentro dos parâmetros recomendados');
    }

    return suggestions;
  };

  const getSeverityColor = (score: number) => {
    if (score > 60) return 'text-destructive';
    if (score > 30) return 'text-warning';
    return 'text-success';
  };

  const getSeverityBadge = (score: number) => {
    if (score > 60) return { variant: 'destructive' as const, label: 'CRÍTICO' };
    if (score > 30) return { variant: 'secondary' as const, label: 'MODERADO' };
    return { variant: 'outline' as const, label: 'LEVE' };
  };

  if (clientsLoading || campaignsLoading) {
    return (
      <ReportLayout
        title="Relatório de Orçamento Mal Distribuído"
        description="Detecção de clientes que não seguem a estratégia recomendada de alocação"
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

  const totalMisallocatedBudget = budgetAnalysis.reduce((sum, a) => sum + a.total_budget, 0);
  const avgSeverityScore = budgetAnalysis.length > 0 
    ? budgetAnalysis.reduce((sum, a) => sum + a.severity_score, 0) / budgetAnalysis.length 
    : 0;
  const criticalClients = budgetAnalysis.filter(a => a.severity_score > 60).length;

  const availableClients = budgetAnalysis.map(analysis => ({
    value: analysis.client_id,
    label: analysis.client_name
  }));

  const primaryFilters: FilterConfig[] = [
    {
      id: 'cliente',
      label: 'Cliente',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os clientes' },
        ...availableClients
      ],
      placeholder: 'Todos os clientes'
    },
    {
      id: 'severidade',
      label: 'Nível de Severidade',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os níveis' },
        { value: 'critico', label: 'Crítico (> 60%)' },
        { value: 'moderado', label: 'Moderado (30-60%)' },
        { value: 'leve', label: 'Leve (< 30%)' }
      ],
      placeholder: 'Todos os níveis'
    },
    {
      id: 'orcamento-minimo',
      label: 'Orçamento Mínimo',
      type: 'select',
      options: [
        { value: 'sem-limite', label: 'Sem limite' },
        { value: '1000', label: 'R$ 1.000+' },
        { value: '5000', label: 'R$ 5.000+' },
        { value: '10000', label: 'R$ 10.000+' },
        { value: '50000', label: 'R$ 50.000+' }
      ],
      placeholder: 'Sem limite'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'tipo-desequilibrio',
      label: 'Tipo de Desequilíbrio',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'excesso', label: 'Excesso de verba' },
        { value: 'deficit', label: 'Déficit de verba' }
      ],
      placeholder: 'Todos os tipos'
    },
    {
      id: 'etapa-funil',
      label: 'Etapa do Funil',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as etapas' },
        { value: 'topo', label: 'Topo do Funil' },
        { value: 'meio', label: 'Meio do Funil' },
        { value: 'fundo', label: 'Fundo do Funil' },
        { value: 'retencao', label: 'Retenção' }
      ],
      placeholder: 'Todas as etapas'
    }
  ];

  return (
    <ReportLayout
      title="Relatório de Orçamento Mal Distribuído"
      description="Detecção de clientes que não seguem a estratégia recomendada de alocação"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      filterDescription="Configure os parâmetros para análise de distribuição de orçamento"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Clientes Críticos"
            value={criticalClients}
            trend={criticalClients > 0 ? "down" : "neutral"}
            subtitle="Desequilíbrio > 60%"
          />
          <MetricCard
            title="Orçamento Afetado"
            value={`R$ ${totalMisallocatedBudget.toLocaleString()}`}
            trend="down"
            subtitle="Total mal distribuído"
          />
          <MetricCard
            title="Score Médio"
            value={`${avgSeverityScore.toFixed(0)}/100`}
            trend={avgSeverityScore > 50 ? "down" : avgSeverityScore < 30 ? "up" : "neutral"}
            subtitle="Desequilíbrio médio"
          />
          <MetricCard
            title="Clientes Afetados"
            value={budgetAnalysis.length}
            subtitle="Com desequilíbrios"
          />
        </div>

        {/* Distribuição Recomendada */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Recomendada vs Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Distribuição Recomendada */}
              <div>
                <h4 className="font-semibold mb-4 text-center">Distribuição Recomendada</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Topo do Funil</span>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="w-24" />
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Meio do Funil</span>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="w-24" />
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fundo do Funil</span>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="w-24" />
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Retenção</span>
                    <div className="flex items-center gap-2">
                      <Progress value={10} className="w-24" />
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Pizza */}
              <div>
                <h4 className="font-semibold mb-4 text-center">Visualização</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Topo', value: 30 },
                        { name: 'Meio', value: 30 },
                        { name: 'Fundo', value: 30 },
                        { name: 'Retenção', value: 10 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista Detalhada */}
        <div className="grid gap-4">
          {budgetAnalysis.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum desequilíbrio significativo detectado</h3>
                <p className="text-muted-foreground">
                  Todos os clientes estão com distribuição de orçamento dentro dos parâmetros recomendados.
                </p>
              </CardContent>
            </Card>
          ) : (
            budgetAnalysis.map((analysis) => {
              const severityBadge = getSeverityBadge(analysis.severity_score);
              
              // Preparar dados para o gráfico de barras
              const chartData = Object.keys(analysis.current_distribution).map(stage => {
                const stageKey = stage as keyof typeof analysis.current_distribution;
                const current = (analysis.current_distribution[stageKey] / analysis.total_budget) * 100;
                const recommended = stage === 'topo' ? 30 : stage === 'meio' ? 30 : stage === 'fundo' ? 30 : 10;
                
                return {
                  stage: STAGE_NAMES[stageKey],
                  atual: current,
                  recomendado: recommended
                };
              });

              return (
                <Card key={analysis.client_id} className="border-l-4 border-l-warning">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-warning" />
                          <div>
                            <CardTitle className="text-lg">{analysis.client_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Orçamento Total: R$ {analysis.total_budget.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={severityBadge.variant}>
                            DESEQUILÍBRIO {severityBadge.label}
                          </Badge>
                          <Badge variant="outline">
                            Score: {analysis.severity_score.toFixed(0)}/100
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Gráfico de Comparação */}
                    <div>
                      <h4 className="font-semibold mb-4">Distribuição Atual vs Recomendada</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="stage" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '']} />
                          <Bar dataKey="atual" fill="#ff7c7c" name="Atual" />
                          <Bar dataKey="recomendado" fill="#82ca9d" name="Recomendado" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Desequilíbrios Detalhados */}
                    <div>
                      <h4 className="font-semibold mb-3">Desequilíbrios Identificados:</h4>
                      <div className="space-y-2">
                        {analysis.imbalances
                          .filter(imbalance => imbalance.status !== 'balanced')
                          .map((imbalance, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {imbalance.status === 'excess' ? (
                                  <TrendingUp className="w-4 h-4 text-destructive" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-warning" />
                                )}
                                <span>{imbalance.stage}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {imbalance.current_percent.toFixed(1)}% 
                                  <span className="text-muted-foreground mx-1">vs</span>
                                  {imbalance.recommended_percent}%
                                </div>
                                <div className={`text-sm ${imbalance.status === 'excess' ? 'text-destructive' : 'text-warning'}`}>
                                  {imbalance.status === 'excess' ? '+' : ''}{imbalance.difference.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Sugestões de Reequilíbrio */}
                    <div>
                      <h4 className="font-semibold mb-3 text-primary">Sugestões de Reequilíbrio:</h4>
                      <ul className="space-y-2">
                        {analysis.rebalance_suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
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