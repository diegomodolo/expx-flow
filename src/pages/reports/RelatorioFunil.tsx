import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { FunnelChart, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { FunnelAnalysis } from "@/components/funnel/FunnelAnalysis";
import { Users, MousePointer, Target, Repeat } from "lucide-react";

const RelatorioFunil = () => {
  const { funnelMetrics, campaignRankings } = useDashboardData();

  const chartConfig = {
    reach: { label: "Alcance", color: "hsl(var(--primary))" },
    clicks: { label: "Cliques", color: "hsl(var(--secondary))" },
    leads: { label: "Leads", color: "hsl(var(--accent))" }
  };

  // Simulação de dados do funil por etapa
  const funnelStages = [
    {
      stage: "Topo (Awareness)",
      reach: funnelMetrics.reach,
      cost: funnelMetrics.reach * 0.01, // R$ 0,01 por impressão
      cpl: 0,
      percentage: 100,
      icon: Users,
      color: "hsl(var(--primary))"
    },
    {
      stage: "Meio (Consideration)", 
      reach: funnelMetrics.clicks,
      cost: funnelMetrics.clicks * 0.5, // R$ 0,50 por clique
      cpl: funnelMetrics.clicks > 0 ? (funnelMetrics.clicks * 0.5) / (funnelMetrics.clicks * 0.3) : 0,
      percentage: funnelMetrics.reach > 0 ? (funnelMetrics.clicks / funnelMetrics.reach * 100).toFixed(1) : 0,
      icon: MousePointer,
      color: "hsl(var(--secondary))"
    },
    {
      stage: "Fundo (Conversion)",
      reach: funnelMetrics.leads,
      cost: funnelMetrics.leads * funnelMetrics.cpl,
      cpl: funnelMetrics.cpl,
      percentage: funnelMetrics.clicks > 0 ? (funnelMetrics.leads / funnelMetrics.clicks * 100).toFixed(1) : 0,
      icon: Target,
      color: "hsl(var(--accent))"
    },
    {
      stage: "Retenção",
      reach: Math.floor(funnelMetrics.leads * 0.7), // 70% retention estimate
      cost: Math.floor(funnelMetrics.leads * 0.7) * 50, // R$ 50 custo de retenção
      cpl: 50,
      percentage: "70",
      icon: Repeat,
      color: "hsl(var(--muted))"
    }
  ];

  const budgetDistribution = funnelStages.map(stage => ({
    stage: stage.stage.split(' ')[0],
    current: stage.cost,
    recommended: stage.cost * (stage.stage.includes('Fundo') ? 1.2 : 0.9) // Recomendar mais investimento no fundo
  }));

  const bottlenecks = funnelStages
    .map((stage, index) => ({
      ...stage,
      dropRate: index > 0 ? 100 - parseFloat(stage.percentage.toString()) : 0
    }))
    .filter(stage => stage.dropRate > 0)
    .sort((a, b) => b.dropRate - a.dropRate);

  return (
    <ReportLayout
      title="Relatório de Funil Completo"
      description="Análise detalhada do funil de conversão"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Alcance Total"
          value={funnelMetrics.reach.toLocaleString()}
          subtitle="Impressões"
          trend="up"
        />
        <MetricCard
          title="Taxa de Cliques"
          value={`${funnelMetrics.reach > 0 ? (funnelMetrics.clicks / funnelMetrics.reach * 100).toFixed(2) : 0}%`}
          subtitle="CTR médio"
          trend="up"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${funnelMetrics.clicks > 0 ? (funnelMetrics.leads / funnelMetrics.clicks * 100).toFixed(2) : 0}%`}
          subtitle="Cliques para leads"
          trend="neutral"
        />
        <MetricCard
          title="CPL Médio Funil"
          value={`R$ ${funnelMetrics.cpl.toFixed(2)}`}
          subtitle="Custo por lead"
          trend="down"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Análise Visual do Funil</CardTitle>
          <CardDescription>Visualização da jornada do cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <FunnelAnalysis />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Orçamento</CardTitle>
            <CardDescription>Atual vs Recomendado por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetDistribution}>
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="current" fill="var(--color-reach)" name="Atual" />
                  <Bar dataKey="recommended" fill="var(--color-clicks)" name="Recomendado" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gargalos Identificados</CardTitle>
            <CardDescription>Etapas com maior perda de usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottlenecks.slice(0, 3).map((bottleneck, index) => {
                const Icon = bottleneck.icon;
                return (
                  <div key={bottleneck.stage} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                        {index + 1}
                      </div>
                      <Icon className="w-5 h-5" style={{ color: bottleneck.color }} />
                      <div>
                        <h4 className="font-medium">{bottleneck.stage}</h4>
                        <p className="text-sm text-muted-foreground">
                          {bottleneck.reach.toLocaleString()} usuários
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-semibold">
                        -{bottleneck.dropRate.toFixed(1)}%
                      </span>
                      <p className="text-xs text-muted-foreground">perda</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Métricas Detalhadas por Etapa</CardTitle>
          <CardDescription>Performance completa do funil de conversão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Etapa do Funil</th>
                  <th className="text-right p-3 font-medium">Volume</th>
                  <th className="text-right p-3 font-medium">Taxa de Conversão</th>
                  <th className="text-right p-3 font-medium">Custo Total</th>
                  <th className="text-right p-3 font-medium">CPL/CPA</th>
                  <th className="text-right p-3 font-medium">Eficiência</th>
                </tr>
              </thead>
              <tbody>
                {funnelStages.map((stage, index) => {
                  const Icon = stage.icon;
                  const efficiency = index === 0 ? 100 : parseFloat(stage.percentage.toString());
                  const efficiencyColor = efficiency > 15 ? 'text-green-600' : 
                                         efficiency > 10 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <tr key={stage.stage} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" style={{ color: stage.color }} />
                          <span className="font-medium">{stage.stage}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">{stage.reach.toLocaleString()}</td>
                      <td className="p-3 text-right">{stage.percentage}%</td>
                      <td className="p-3 text-right">R$ {stage.cost.toLocaleString()}</td>
                      <td className="p-3 text-right">R$ {stage.cpl.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${efficiencyColor}`}>
                          {efficiency > 50 ? 'Ótima' : efficiency > 20 ? 'Boa' : efficiency > 10 ? 'Regular' : 'Crítica'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Otimização</CardTitle>
          <CardDescription>Ações para melhorar a performance do funil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Users className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">Otimizar Topo do Funil</h4>
                <p className="text-sm text-muted-foreground">
                  Expandir públicos-alvo e testar novos criativos para aumentar o alcance qualificado
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <MousePointer className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Melhorar Taxa de Cliques</h4>
                <p className="text-sm text-muted-foreground">
                  CTR atual de {funnelMetrics.reach > 0 ? (funnelMetrics.clicks / funnelMetrics.reach * 100).toFixed(2) : 0}% 
                  pode ser otimizado para 3-4% com criativos mais atrativos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Target className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium">Otimizar Conversões</h4>
                <p className="text-sm text-muted-foreground">
                  Revisar landing pages e formulários para reduzir fricção na conversão
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioFunil;