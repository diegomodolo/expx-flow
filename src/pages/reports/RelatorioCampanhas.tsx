import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Play, Pause, AlertCircle, TrendingUp } from "lucide-react";

const RelatorioCampanhas = () => {
  const { campaignRankings } = useDashboardData();
  const { campaigns } = useCampaigns();

  const chartConfig = {
    spend: { label: "Investimento", color: "hsl(var(--primary))" },
    conversions: { label: "Conversões", color: "hsl(var(--secondary))" },
    ctr: { label: "CTR", color: "hsl(var(--accent))" }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);

  const statusData = [
    { name: 'Ativas', value: activeCampaigns, color: 'hsl(var(--primary))' },
    { name: 'Pausadas', value: pausedCampaigns, color: 'hsl(var(--muted))' },
    { name: 'Rascunho', value: campaigns.filter(c => c.status === 'draft').length, color: 'hsl(var(--secondary))' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const getPerformanceLevel = (ctr: number, cpa: number) => {
    if (ctr > 2 && cpa < 50) return { level: 'Excelente', color: 'text-green-600' };
    if (ctr > 1.5 && cpa < 80) return { level: 'Bom', color: 'text-blue-600' };
    if (ctr > 1 && cpa < 120) return { level: 'Regular', color: 'text-yellow-600' };
    return { level: 'Crítico', color: 'text-red-600' };
  };

  return (
    <ReportLayout
      title="Relatório de Campanhas"
      description="Status detalhado e KPIs de todas as campanhas"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Campanhas Ativas"
          value={activeCampaigns}
          subtitle="Em execução"
          trend="up"
        />
        <MetricCard
          title="Investimento Total"
          value={`R$ ${totalSpend.toLocaleString()}`}
          subtitle="Últimos 30 dias"
          trend="up"
        />
        <MetricCard
          title="Conversões Totais"
          value={totalConversions.toLocaleString()}
          trend="up"
        />
        <MetricCard
          title="CPA Médio"
          value={`R$ ${totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00'}`}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance por Campanha</CardTitle>
            <CardDescription>Top 8 campanhas por investimento</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignRankings.slice(0, 8)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="spend" fill="var(--color-spend)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Estado atual das campanhas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas Detalhadas</CardTitle>
          <CardDescription>Lista completa com métricas de performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Campanha</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Investimento</th>
                  <th className="text-right p-3 font-medium">Conversões</th>
                  <th className="text-right p-3 font-medium">CTR</th>
                  <th className="text-right p-3 font-medium">CPA</th>
                  <th className="text-center p-3 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const performance = getPerformanceLevel(campaign.ctr, campaign.cpa);
                  
                  return (
                    <tr key={campaign.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.platforms}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(campaign.status)}
                          <Badge className={getStatusBadge(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-right">R$ {campaign.spend.toLocaleString()}</td>
                      <td className="p-3 text-right">{campaign.conversions}</td>
                      <td className="p-3 text-right">{campaign.ctr.toFixed(2)}%</td>
                      <td className="p-3 text-right">R$ {campaign.cpa.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`font-medium ${performance.color}`}>
                          {performance.level}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Campanhas com melhor CTR e menor CPA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns
                .sort((a, b) => (b.ctr / b.cpa) - (a.ctr / a.cpa))
                .slice(0, 5)
                .map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        CTR: {campaign.ctr.toFixed(2)}% • CPA: R$ {campaign.cpa.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campanhas para Otimização</CardTitle>
            <CardDescription>Requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns
                .filter(c => c.ctr < 1.5 || c.cpa > 100)
                .slice(0, 5)
                .map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-red-600">
                      {campaign.ctr < 1.5 && `CTR baixo: ${campaign.ctr.toFixed(2)}%`}
                      {campaign.ctr < 1.5 && campaign.cpa > 100 && ' • '}
                      {campaign.cpa > 100 && `CPA alto: R$ ${campaign.cpa.toFixed(2)}`}
                    </p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default RelatorioCampanhas;