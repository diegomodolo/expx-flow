import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Target, DollarSign } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCRMSourcesAnalysis } from "@/hooks/useCRMSourcesAnalysis";
import { formatCurrency, formatPercentage } from "@/lib/crmReportUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CRMSourcesReportProps {
  workspaceId: string;
}

const TEMPERATURE_COLORS = {
  quente: "#ef4444",
  morno: "#f97316",
  frio: "#3b82f6",
};

export function CRMSourcesReport({ workspaceId }: CRMSourcesReportProps) {
  const [startDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate] = useState<Date>(new Date());
  const [groupBy, setGroupBy] = useState<"source" | "campaign" | "medium">("source");

  const { data: metrics, isLoading } = useCRMSourcesAnalysis(workspaceId, startDate, endDate, groupBy);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const topSourcesByLeads = [...metrics.sourcePerformance]
    .sort((a, b) => b.totalLeads - a.totalLeads)
    .slice(0, 10)
    .map(source => ({
      name: groupBy === "source" ? source.source : groupBy === "campaign" ? source.campaign : source.medium,
      leads: source.totalLeads,
      conversions: source.convertedLeads,
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Fontes</h2>
          <p className="text-muted-foreground mt-1">
            Performance por origem e UTM
          </p>
        </div>
        <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Agrupar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">Por Fonte</SelectItem>
            <SelectItem value="campaign">Por Campanha</SelectItem>
            <SelectItem value="medium">Por Meio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Fontes Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSources}</div>
            <p className="text-xs text-muted-foreground">
              Fontes com leads no período
            </p>
          </CardContent>
        </Card>

        {metrics.bestSource && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Melhor Fonte (Taxa)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.bestSource.name}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.bestSource.conversionRate)} de conversão
              </p>
            </CardContent>
          </Card>
        )}

        {metrics.bestCampaign && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Melhor Campanha (Leads)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.bestCampaign.name}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.bestCampaign.leads} conversões
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico: Top 10 Fontes por Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Fontes por Número de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSourcesByLeads} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="leads" fill="#f97316" name="Total de Leads" />
                <Bar dataKey="conversions" fill="#22c55e" name="Conversões" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tabela de Performance por Fonte */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Detalhada por {groupBy === "source" ? "Fonte" : groupBy === "campaign" ? "Campanha" : "Meio"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupBy === "source" ? "Fonte" : groupBy === "campaign" ? "Campanha" : "Meio"}</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Conversões</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead>Temperatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.sourcePerformance.slice(0, 15).map((source) => (
                <TableRow key={source.source + source.campaign + source.medium}>
                  <TableCell className="font-medium">
                    {groupBy === "source" ? source.source : groupBy === "campaign" ? source.campaign : source.medium}
                  </TableCell>
                  <TableCell className="text-right">{source.totalLeads}</TableCell>
                  <TableCell className="text-right">{source.convertedLeads}</TableCell>
                  <TableCell className="text-right">
                    <span className={source.conversionRate >= 20 ? "text-green-600 font-semibold" : ""}>
                      {formatPercentage(source.conversionRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(source.totalRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(source.averageTicket)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {source.temperatureDistribution.quente > 0 && (
                        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: TEMPERATURE_COLORS.quente + "20", color: TEMPERATURE_COLORS.quente }}>
                          🔥 {source.temperatureDistribution.quente}
                        </div>
                      )}
                      {source.temperatureDistribution.morno > 0 && (
                        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: TEMPERATURE_COLORS.morno + "20", color: TEMPERATURE_COLORS.morno }}>
                          🌡️ {source.temperatureDistribution.morno}
                        </div>
                      )}
                      {source.temperatureDistribution.frio > 0 && (
                        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: TEMPERATURE_COLORS.frio + "20", color: TEMPERATURE_COLORS.frio }}>
                          ❄️ {source.temperatureDistribution.frio}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
