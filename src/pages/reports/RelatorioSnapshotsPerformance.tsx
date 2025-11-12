import { useState } from "react";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerformanceSnapshots } from "@/hooks/usePerformanceSnapshots";
import { useClients } from "@/hooks/useClients";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, MousePointer, Eye } from "lucide-react";

export default function RelatorioSnapshotsPerformance() {
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [entityType, setEntityType] = useState<string>("all");

  const { clients } = useClients();
  
  const startDate = format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data: snapshots, isLoading } = usePerformanceSnapshots({
    clientId: selectedClient !== "all" ? selectedClient : undefined,
    startDate,
    endDate,
    entityType: entityType !== "all" ? entityType as any : undefined,
  });

  // Agrupar dados por data para gráficos
  const chartData = snapshots?.reduce((acc: any[], snapshot) => {
    const date = snapshot.snapshot_date;
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.spend += snapshot.spend || 0;
      existing.conversions += snapshot.conversions || 0;
      existing.impressions += snapshot.impressions || 0;
      existing.clicks += snapshot.clicks || 0;
    } else {
      acc.push({
        date,
        spend: snapshot.spend || 0,
        conversions: snapshot.conversions || 0,
        impressions: snapshot.impressions || 0,
        clicks: snapshot.clicks || 0,
        cpa: snapshot.cpa || 0,
        ctr: snapshot.ctr || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)) || [];

  // Calcular totais
  const totals = snapshots?.reduce((acc, snapshot) => ({
    spend: acc.spend + (snapshot.spend || 0),
    conversions: acc.conversions + (snapshot.conversions || 0),
    impressions: acc.impressions + (snapshot.impressions || 0),
    clicks: acc.clicks + (snapshot.clicks || 0),
  }), { spend: 0, conversions: 0, impressions: 0, clicks: 0 }) || { spend: 0, conversions: 0, impressions: 0, clicks: 0 };

  const avgCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <ReportLayout
      title="Snapshots de Performance Diária"
      description="Histórico de métricas coletadas diariamente do Facebook Ads"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Entidade</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="campaign">Campanhas</SelectItem>
                  <SelectItem value="ad_set">Conjuntos de Anúncios</SelectItem>
                  <SelectItem value="ad">Anúncios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Investimento Total</span>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">R$ {totals.spend.toFixed(2)}</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Conversões</span>
                  <Target className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{totals.conversions}</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CPA Médio</span>
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">R$ {avgCpa.toFixed(2)}</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CTR Médio</span>
                  <MousePointer className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{avgCtr.toFixed(2)}%</div>
              </Card>
            </div>

            {/* Gráficos */}
            <Tabs defaultValue="conversions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="conversions">Conversões</TabsTrigger>
                <TabsTrigger value="spend">Investimento</TabsTrigger>
                <TabsTrigger value="impressions">Impressões</TabsTrigger>
                <TabsTrigger value="ctr">CTR / CPA</TabsTrigger>
              </TabsList>

              <TabsContent value="conversions" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Conversões por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversions" fill="hsl(var(--primary))" name="Conversões" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="spend" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Investimento por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" name="Investimento (R$)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="impressions" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Impressões e Cliques por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="impressions" stroke="#8884d8" name="Impressões" strokeWidth={2} />
                      <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="Cliques" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="ctr" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">CTR e CPA por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#8884d8" name="CTR (%)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="cpa" stroke="#82ca9d" name="CPA (R$)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
