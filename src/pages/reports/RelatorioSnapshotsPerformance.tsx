import { useState } from "react";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePerformanceSnapshots } from "@/hooks/usePerformanceSnapshots";
import { useClients } from "@/hooks/useClients";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, MousePointer, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RelatorioSnapshotsPerformance() {
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [entityType, setEntityType] = useState<string>("all");
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);

  const { clients } = useClients();
  
  const days = parseInt(dateRange);
  const currentEndDate = format(new Date(), "yyyy-MM-dd");
  const currentStartDate = format(subDays(new Date(), days), "yyyy-MM-dd");
  
  const previousEndDate = format(subDays(new Date(), days + 1), "yyyy-MM-dd");
  const previousStartDate = format(subDays(new Date(), days * 2 + 1), "yyyy-MM-dd");

  const { data: currentSnapshots, isLoading: currentLoading } = usePerformanceSnapshots({
    clientId: selectedClient !== "all" ? selectedClient : undefined,
    startDate: currentStartDate,
    endDate: currentEndDate,
    entityType: entityType !== "all" ? entityType as any : undefined,
  });

  const { data: previousSnapshots, isLoading: previousLoading } = usePerformanceSnapshots({
    clientId: selectedClient !== "all" ? selectedClient : undefined,
    startDate: previousStartDate,
    endDate: previousEndDate,
    entityType: entityType !== "all" ? entityType as any : undefined,
  });

  const isLoading = currentLoading || (compareEnabled && previousLoading);

  // Agrupar dados por data para gráficos - período atual
  const currentChartData = currentSnapshots?.reduce((acc: any[], snapshot) => {
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

  // Agrupar dados por data para gráficos - período anterior
  const previousChartData = previousSnapshots?.reduce((acc: any[], snapshot) => {
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

  // Calcular totais - período atual
  const currentTotals = currentSnapshots?.reduce((acc, snapshot) => ({
    spend: acc.spend + (snapshot.spend || 0),
    conversions: acc.conversions + (snapshot.conversions || 0),
    impressions: acc.impressions + (snapshot.impressions || 0),
    clicks: acc.clicks + (snapshot.clicks || 0),
  }), { spend: 0, conversions: 0, impressions: 0, clicks: 0 }) || { spend: 0, conversions: 0, impressions: 0, clicks: 0 };

  const currentAvgCpa = currentTotals.conversions > 0 ? currentTotals.spend / currentTotals.conversions : 0;
  const currentAvgCtr = currentTotals.impressions > 0 ? (currentTotals.clicks / currentTotals.impressions) * 100 : 0;

  // Calcular totais - período anterior
  const previousTotals = previousSnapshots?.reduce((acc, snapshot) => ({
    spend: acc.spend + (snapshot.spend || 0),
    conversions: acc.conversions + (snapshot.conversions || 0),
    impressions: acc.impressions + (snapshot.impressions || 0),
    clicks: acc.clicks + (snapshot.clicks || 0),
  }), { spend: 0, conversions: 0, impressions: 0, clicks: 0 }) || { spend: 0, conversions: 0, impressions: 0, clicks: 0 };

  const previousAvgCpa = previousTotals.conversions > 0 ? previousTotals.spend / previousTotals.conversions : 0;
  const previousAvgCtr = previousTotals.impressions > 0 ? (previousTotals.clicks / previousTotals.impressions) * 100 : 0;

  // Calcular variações percentuais
  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const variations = {
    spend: calculateVariation(currentTotals.spend, previousTotals.spend),
    conversions: calculateVariation(currentTotals.conversions, previousTotals.conversions),
    cpa: calculateVariation(currentAvgCpa, previousAvgCpa),
    ctr: calculateVariation(currentAvgCtr, previousAvgCtr),
  };

  // Helper para renderizar indicador de variação
  const VariationIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    if (value === 0) return null;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600"
      )}>
        {isPositive && <ArrowUp className="h-3 w-3" />}
        {isNegative && <ArrowDown className="h-3 w-3" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <ReportLayout
      title="Snapshots de Performance Diária"
      description="Histórico de métricas coletadas diariamente do Facebook Ads"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="compare-mode"
                  checked={compareEnabled}
                  onCheckedChange={setCompareEnabled}
                />
                <Label htmlFor="compare-mode" className="cursor-pointer">
                  Comparar com período anterior
                </Label>
              </div>
              {compareEnabled && (
                <div className="text-sm text-muted-foreground">
                  Comparando últimos {dateRange} dias vs {dateRange} dias anteriores
                </div>
              )}
            </div>
            
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
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">R$ {currentTotals.spend.toFixed(2)}</div>
                  {compareEnabled && <VariationIndicator value={variations.spend} />}
                </div>
                {compareEnabled && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Anterior: R$ {previousTotals.spend.toFixed(2)}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Conversões</span>
                  <Target className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{currentTotals.conversions}</div>
                  {compareEnabled && <VariationIndicator value={variations.conversions} />}
                </div>
                {compareEnabled && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Anterior: {previousTotals.conversions}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CPA Médio</span>
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">R$ {currentAvgCpa.toFixed(2)}</div>
                  {compareEnabled && <VariationIndicator value={variations.cpa} inverse />}
                </div>
                {compareEnabled && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Anterior: R$ {previousAvgCpa.toFixed(2)}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CTR Médio</span>
                  <MousePointer className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{currentAvgCtr.toFixed(2)}%</div>
                  {compareEnabled && <VariationIndicator value={variations.ctr} />}
                </div>
                {compareEnabled && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Anterior: {previousAvgCtr.toFixed(2)}%
                  </div>
                )}
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
                  <h3 className="text-lg font-semibold mb-4">
                    Conversões por Dia
                    {compareEnabled && <span className="text-sm font-normal text-muted-foreground ml-2">(Comparação de períodos)</span>}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={compareEnabled ? [...previousChartData.map(d => ({ ...d, period: 'anterior' })), ...currentChartData.map(d => ({ ...d, period: 'atual' }))] : currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {compareEnabled ? (
                        <>
                          <Bar dataKey="conversions" fill="hsl(var(--primary))" name="Período Atual" />
                          <Bar dataKey="conversions" fill="hsl(var(--muted))" name="Período Anterior" opacity={0.5} />
                        </>
                      ) : (
                        <Bar dataKey="conversions" fill="hsl(var(--primary))" name="Conversões" />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="spend" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Investimento por Dia
                    {compareEnabled && <span className="text-sm font-normal text-muted-foreground ml-2">(Comparação de períodos)</span>}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" name="Período Atual (R$)" strokeWidth={2} />
                      {compareEnabled && (
                        <Line type="monotone" data={previousChartData} dataKey="spend" stroke="hsl(var(--muted))" name="Período Anterior (R$)" strokeWidth={2} strokeDasharray="5 5" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="impressions" className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Impressões e Cliques por Dia
                    {compareEnabled && <span className="text-sm font-normal text-muted-foreground ml-2">(Período atual)</span>}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={currentChartData}>
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
                  <h3 className="text-lg font-semibold mb-4">
                    CTR e CPA por Dia
                    {compareEnabled && <span className="text-sm font-normal text-muted-foreground ml-2">(Comparação de períodos)</span>}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#8884d8" name="CTR Atual (%)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="cpa" stroke="#82ca9d" name="CPA Atual (R$)" strokeWidth={2} />
                      {compareEnabled && (
                        <>
                          <Line yAxisId="left" type="monotone" data={previousChartData} dataKey="ctr" stroke="#8884d8" name="CTR Anterior (%)" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
                          <Line yAxisId="right" type="monotone" data={previousChartData} dataKey="cpa" stroke="#82ca9d" name="CPA Anterior (R$)" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
                        </>
                      )}
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
