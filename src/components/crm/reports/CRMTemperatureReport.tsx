import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Flame, Thermometer, Snowflake, AlertTriangle, TrendingUp } from "lucide-react";
import { subDays } from "date-fns";
import { useCRMTemperatureAnalysis } from "@/hooks/useCRMTemperatureAnalysis";
import { formatCurrency, formatPercentage, getTemperatureColor } from "@/lib/crmReportUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CRMTemperatureReportProps {
  workspaceId: string;
}

const TEMPERATURE_CONFIG = {
  quente: { icon: Flame, color: "#ef4444", label: "Quente" },
  morno: { icon: Thermometer, color: "#f97316", label: "Morno" },
  frio: { icon: Snowflake, color: "#3b82f6", label: "Frio" },
  undefined: { icon: AlertTriangle, color: "#6b7280", label: "Não Definida" },
};

export function CRMTemperatureReport({ workspaceId }: CRMTemperatureReportProps) {
  const [startDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate] = useState<Date>(new Date());

  const { data: metrics, isLoading } = useCRMTemperatureAnalysis(workspaceId, startDate, endDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const pieData = [
    { name: "Quente", value: metrics.distribution.quente.count, color: TEMPERATURE_CONFIG.quente.color },
    { name: "Morno", value: metrics.distribution.morno.count, color: TEMPERATURE_CONFIG.morno.color },
    { name: "Frio", value: metrics.distribution.frio.count, color: TEMPERATURE_CONFIG.frio.color },
    { name: "Não Definida", value: metrics.distribution.undefined.count, color: TEMPERATURE_CONFIG.undefined.color },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Temperatura</h2>
          <p className="text-muted-foreground mt-1">
            Distribuição e conversão por qualificação
          </p>
        </div>
      </div>

      {/* Cards de Distribuição por Temperatura */}
      <div className="grid gap-4 md:grid-cols-4">
        {(Object.keys(TEMPERATURE_CONFIG) as Array<keyof typeof TEMPERATURE_CONFIG>).map((temp) => {
          const config = TEMPERATURE_CONFIG[temp];
          const data = metrics.distribution[temp];
          const Icon = config.icon;

          return (
            <Card key={temp}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <Icon className="h-4 w-4" style={{ color: config.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(data.percentage)} do total
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita: {formatCurrency(data.revenue)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Pizza: Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Leads por Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tabela Comparativa de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle>Performance de Conversão por Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Temperatura</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.conversionByTemperature.map((item) => (
                  <TableRow key={item.temperature}>
                    <TableCell className="font-medium">{item.temperature}</TableCell>
                    <TableCell className="text-right">{item.totalLeads}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.conversionRate >= 20 ? "text-green-600 font-semibold" : ""}>
                        {formatPercentage(item.conversionRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{item.avgConversionTime.toFixed(1)} dias</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alertas: Leads Quentes Sem Atividade */}
      {metrics.hotLeadsWithoutActivity.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Leads Quentes Sem Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {metrics.hotLeadsWithoutActivity.length} leads qualificados como "quente" sem atividades nos últimos 7+ dias. 
              Valor total em risco: {formatCurrency(metrics.hotLeadsWithoutActivity.reduce((sum, l) => sum + l.value, 0))}
            </p>
            <div className="space-y-2">
              {metrics.hotLeadsWithoutActivity.slice(0, 5).map((lead) => (
                <div key={lead.leadId} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{lead.leadName}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(lead.value)}</p>
                    <Badge variant="destructive">{lead.daysSinceLastActivity} dias</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oportunidades: Leads Frios com Alto Valor */}
      {metrics.coldLeadsWithHighValue.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Leads Frios com Alto Potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {metrics.coldLeadsWithHighValue.length} leads frios com valor acima da média. 
              Oportunidade de reaquecimento: {formatCurrency(metrics.coldLeadsWithHighValue.reduce((sum, l) => sum + l.value, 0))}
            </p>
            <div className="space-y-2">
              {metrics.coldLeadsWithHighValue.slice(0, 5).map((lead) => (
                <div key={lead.leadId} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{lead.leadName}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Estágio: {lead.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">{formatCurrency(lead.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
