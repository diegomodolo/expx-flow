import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Activity, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCRMActivitiesAnalysis } from "@/hooks/useCRMActivitiesAnalysis";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CRMActivitiesReportProps {
  workspaceId: string;
}

const ACTIVITY_COLORS = {
  stage_change: "#3b82f6",
  manual_note: "#a855f7",
  updated: "#22c55e",
  temperature_change: "#f97316",
  other: "#6b7280",
};

export function CRMActivitiesReport({ workspaceId }: CRMActivitiesReportProps) {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: metrics, isLoading } = useCRMActivitiesAnalysis(workspaceId, startDate, endDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const inactiveLeads7Days = metrics.inactiveLeads.filter(l => l.daysSinceLastActivity >= 7 && l.daysSinceLastActivity < 30).length;
  const inactiveLeads30Days = metrics.inactiveLeads.filter(l => l.daysSinceLastActivity >= 30).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Atividades</h2>
          <p className="text-muted-foreground mt-1">
            Engajamento e tempo de resposta por lead
          </p>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Entre Atividades</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTimeBetweenActivities.toFixed(1)} dias</div>
            <p className="text-xs text-muted-foreground">
              Intervalo médio de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Inativos (7+ dias)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveLeads7Days}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Inativos (30+ dias)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveLeads30Days}</div>
            <p className="text-xs text-muted-foreground">
              Ação urgente necessária
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribuição por Tipo de Atividade */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.activitiesByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.type} (${entry.percentage.toFixed(1)}%)`}
                  >
                    {metrics.activitiesByType.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={ACTIVITY_COLORS[entry.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.other} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Atividades ao Longo do Tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.activitiesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "dd/MM")}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), "dd/MM/yyyy", { locale: ptBR })}
                  />
                  <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Leads Mais Ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Leads Mais Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.mostActiveLeads.map((lead, index) => (
              <div key={lead.leadId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{lead.leadName}</p>
                    <p className="text-sm text-muted-foreground">{lead.activitiesCount} atividades</p>
                  </div>
                </div>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${(lead.activitiesCount / (metrics.mostActiveLeads[0]?.activitiesCount || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads Inativos */}
      {metrics.inactiveLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads Sem Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.inactiveLeads.slice(0, 10).map((lead) => (
                <div key={lead.leadId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{lead.leadName}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Estágio: {lead.stage}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={lead.daysSinceLastActivity >= 30 ? "destructive" : "secondary"}>
                      {lead.daysSinceLastActivity} dias sem atividade
                    </Badge>
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
