import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, TrendingUp, TrendingDown, DollarSign, Target, Clock, AlertCircle, CheckCircle2, ArrowUpRight } from "lucide-react";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCRMExecutiveReport } from "@/hooks/useCRMExecutiveReport";
import { formatCurrency, formatPercentage } from "@/lib/crmReportUtils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface CRMExecutiveReportProps {
  workspaceId: string;
}

export function CRMExecutiveReport({ workspaceId }: CRMExecutiveReportProps) {
  const [startDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate] = useState<Date>(new Date());
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);

  const { data: metrics, isLoading } = useCRMExecutiveReport(workspaceId, startDate, endDate, compareWithPrevious);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const insightTypeConfig = {
    success: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
    warning: { icon: AlertCircle, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
    info: { icon: Target, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatório Executivo</h2>
          <p className="text-muted-foreground mt-1">
            Período: {format(new Date(metrics.period.startDate), "dd/MM/yyyy")} - {format(new Date(metrics.period.endDate), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              id="compare" 
              checked={compareWithPrevious} 
              onCheckedChange={setCompareWithPrevious}
            />
            <Label htmlFor="compare" className="text-sm">Comparar com período anterior</Label>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Resumo Executivo - Cards Principais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Resumo Executivo</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.totalLeads}</div>
              {compareWithPrevious && metrics.comparison.leadsChange !== 0 && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  {metrics.comparison.leadsChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={metrics.comparison.leadsChange > 0 ? "text-green-600" : "text-red-600"}>
                    {metrics.comparison.leadsChange > 0 ? "+" : ""}{metrics.comparison.leadsChange.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.summary.totalRevenue)}</div>
              {compareWithPrevious && metrics.comparison.revenueChange !== 0 && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  {metrics.comparison.revenueChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={metrics.comparison.revenueChange > 0 ? "text-green-600" : "text-red-600"}>
                    {metrics.comparison.revenueChange > 0 ? "+" : ""}{metrics.comparison.revenueChange.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(metrics.summary.conversionRate)}</div>
              {compareWithPrevious && metrics.comparison.conversionRateChange !== 0 && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  {metrics.comparison.conversionRateChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={metrics.comparison.conversionRateChange > 0 ? "text-green-600" : "text-red-600"}>
                    {metrics.comparison.conversionRateChange > 0 ? "+" : ""}{metrics.comparison.conversionRateChange.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.summary.avgTicket)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.summary.convertedLeads} conversões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Conversão</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.avgConversionTime.toFixed(1)} dias</div>
              <p className="text-xs text-muted-foreground mt-1">
                Do lead até fechamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor no Pipeline</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.summary.pipelineValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Oportunidades em aberto
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Principais Insights */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Principais Insights</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.topInsights.map((insight, index) => {
            const config = insightTypeConfig[insight.type];
            const Icon = config.icon;

            return (
              <Card key={index} className={`${config.bgColor} ${config.borderColor} border-2`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{insight.description}</p>
                  {insight.metric && (
                    <Badge className="mt-2" variant="secondary">
                      {insight.metric}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Top 5 Fontes por Receita */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Fontes por Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topSources}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Bar dataKey="revenue" fill="#22c55e" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
