import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { TrendingUp, Target, DollarSign } from "lucide-react";

const RelatorioExecutivo = () => {
  const { metrics, clientsPerformance, campaignRankings, trends } = useDashboardData();

  const chartConfig = {
    investment: { label: "Investimento", color: "hsl(var(--primary))" },
    leads: { label: "Leads", color: "hsl(var(--secondary))" },
    cpa: { label: "CPA", color: "hsl(var(--accent))" }
  };

  const roi = metrics.totalInvestment > 0 ? 
    ((metrics.totalLeads * 150 - metrics.totalInvestment) / metrics.totalInvestment * 100).toFixed(1) : 0;

  const topCampaigns = campaignRankings
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 3);

  const getROITrend = () => {
    const currentROI = parseFloat(roi.toString());
    return currentROI > 200 ? "up" : currentROI > 100 ? "neutral" : "down";
  };

  return (
    <ReportLayout
      title="Relatório Executivo"
      description="Visão geral para gestores e proprietários"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Investimento Total"
          value={`R$ ${metrics.totalInvestment.toLocaleString()}`}
          change={15}
          changeLabel="mês anterior"
          trend="up"
        />
        <MetricCard
          title="Leads Gerados"
          value={metrics.totalLeads.toLocaleString()}
          change={22}
          changeLabel="mês anterior"
          trend="up"
        />
        <MetricCard
          title="CPL Médio"
          value={`R$ ${(metrics.totalInvestment / metrics.totalLeads || 0).toFixed(2)}`}
          change={-8}
          changeLabel="mês anterior"
          trend="up"
        />
        <MetricCard
          title="ROI Estimado"
          value={`${roi}%`}
          change={12}
          changeLabel="mês anterior"
          trend={getROITrend()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Investimento vs Leads</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="investment" 
                    stroke="var(--color-investment)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-investment)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="var(--color-leads)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-leads)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance por Cliente</CardTitle>
            <CardDescription>Top 5 clientes por ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientsPerformance.slice(0, 5)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="investment" fill="var(--color-leads)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top 3 Campanhas do Período</CardTitle>
          <CardDescription>Campanhas com melhor performance em conversões</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCampaigns.map((campaign, index) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold">{campaign.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      CTR: {campaign.ctr.toFixed(2)}% • CPA: R$ {campaign.cpa.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">{campaign.conversions} conversões</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    R$ {campaign.spend.toLocaleString()} investidos
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Principais Oportunidades</CardTitle>
            <CardDescription>Ações para otimizar resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Target className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Otimização de CPA</h4>
                  <p className="text-sm text-muted-foreground">
                    Identificamos {clientsPerformance.filter(c => c.investment > 10000).length} clientes 
                    com CPA acima da média que podem ser otimizados
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">Realocação de Orçamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Redistribuir investimento para campanhas de maior ROI pode 
                    aumentar resultados em até 25%
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium">Expansão de Público</h4>
                  <p className="text-sm text-muted-foreground">
                    Campanhas com CTR alto podem expandir para públicos similares
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Implementadas</CardTitle>
            <CardDescription>Últimas otimizações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Otimização de Criativos</h4>
                  <p className="text-sm text-muted-foreground">Renovação de anúncios com baixo CTR</p>
                </div>
                <span className="text-xs text-green-600 font-medium">Concluído</span>
              </div>

              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Ajuste de Orçamentos</h4>
                  <p className="text-sm text-muted-foreground">Redistribuição baseada em performance</p>
                </div>
                <span className="text-xs text-green-600 font-medium">Concluído</span>
              </div>

              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Análise de Concorrência</h4>
                  <p className="text-sm text-muted-foreground">Monitoramento de estratégias competitivas</p>
                </div>
                <span className="text-xs text-blue-600 font-medium">Em andamento</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default RelatorioExecutivo;