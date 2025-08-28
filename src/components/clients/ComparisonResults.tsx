import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus, X, DollarSign, MousePointer, Eye, Target } from "lucide-react";
import { type ComparisonMetrics } from "@/hooks/usePeriodComparisons";

interface ComparisonResultsProps {
  comparisonId: string;
  onClose: () => void;
  getComparisonMetrics: (comparisonId: string) => Promise<ComparisonMetrics | null>;
}

export function ComparisonResults({ comparisonId, onClose, getComparisonMetrics }: ComparisonResultsProps) {
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await getComparisonMetrics(comparisonId);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching comparison metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [comparisonId, getComparisonMetrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (change: number, isInverted = false) => {
    if (change > 0) return isInverted ? "text-red-600" : "text-green-600";
    if (change < 0) return isInverted ? "text-green-600" : "text-red-600";
    return "text-gray-500";
  };

  const getChangeText = (change: number, changePercentage: number, formatter: (value: number) => string, isInverted = false) => {
    const sign = change >= 0 ? "+" : "";
    const signPercentage = changePercentage >= 0 ? "+" : "";
    return `${sign}${formatter(Math.abs(change))} (${signPercentage}${changePercentage.toFixed(1)}%)`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Carregando Resultados...</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Erro ao Carregar</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Não foi possível carregar os dados da comparação.</p>
        </CardContent>
      </Card>
    );
  }

  const mainMetrics = [
    {
      title: "Investimento",
      icon: DollarSign,
      period1: formatCurrency(metrics.period1.spend),
      period2: formatCurrency(metrics.period2.spend),
      change: metrics.changes.spend_change,
      changePercentage: metrics.changes.spend_change_pct,
      formatter: formatCurrency,
      isInverted: false, // Higher spend is not necessarily bad
    },
    {
      title: "Conversões",
      icon: Target,
      period1: formatNumber(metrics.period1.conversions),
      period2: formatNumber(metrics.period2.conversions),
      change: metrics.changes.conversions_change,
      changePercentage: metrics.changes.conversions_change_pct,
      formatter: formatNumber,
      isInverted: false,
    },
    {
      title: "CPA",
      icon: DollarSign,
      period1: formatCurrency(metrics.period1.cpa),
      period2: formatCurrency(metrics.period2.cpa),
      change: metrics.changes.cpa_change,
      changePercentage: metrics.changes.cpa_change_pct,
      formatter: formatCurrency,
      isInverted: true, // Lower CPA is better
    },
    {
      title: "CTR",
      icon: MousePointer,
      period1: formatPercentage(metrics.period1.ctr),
      period2: formatPercentage(metrics.period2.ctr),
      change: metrics.changes.ctr_change,
      changePercentage: metrics.changes.ctr_change_pct,
      formatter: (value: number) => formatPercentage(value),
      isInverted: false,
    },
  ];

  const secondaryMetrics = [
    {
      title: "Impressões",
      period1: formatNumber(metrics.period1.impressions),
      period2: formatNumber(metrics.period2.impressions),
      change: metrics.changes.impressions_change,
      changePercentage: metrics.changes.impressions_change_pct,
    },
    {
      title: "Cliques",
      period1: formatNumber(metrics.period1.clicks),
      period2: formatNumber(metrics.period2.clicks),
      change: metrics.changes.clicks_change,
      changePercentage: metrics.changes.clicks_change_pct,
    },
    {
      title: "Alcance",
      period1: formatNumber(metrics.period1.reach),
      period2: formatNumber(metrics.period2.reach),
      change: metrics.changes.reach_change,
      changePercentage: metrics.changes.reach_change_pct,
    },
    {
      title: "CPC",
      period1: formatCurrency(metrics.period1.cpc),
      period2: formatCurrency(metrics.period2.cpc),
      change: metrics.changes.cpc_change,
      changePercentage: metrics.changes.cpc_change_pct,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resultados da Comparação</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics */}
        <div>
          <h3 className="font-medium mb-4">Principais Indicadores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mainMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{metric.title}</span>
                      </div>
                      {getTrendIcon(metric.change)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Período 1:</span>
                        <span>{metric.period1}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Período 2:</span>
                        <span>{metric.period2}</span>
                      </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className={`text-sm font-medium ${getTrendColor(metric.change, metric.isInverted)}`}>
                      {getChangeText(metric.change, metric.changePercentage, metric.formatter, metric.isInverted)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Secondary Metrics */}
        <div>
          <h3 className="font-medium mb-4">Métricas Complementares</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryMetrics.map((metric) => (
              <Card key={metric.title} className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{metric.title}</span>
                    {getTrendIcon(metric.change)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Período 1:</span>
                      <span>{metric.period1}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Período 2:</span>
                      <span>{metric.period2}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className={`text-xs ${getTrendColor(metric.change)}`}>
                    {metric.change >= 0 ? "+" : ""}{metric.changePercentage.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Summary */}
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Resumo da Comparação</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Período 1:</span>
                <div className="font-medium">
                  {formatNumber(metrics.period1.campaigns_count)} campanhas
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Período 2:</span>
                <div className="font-medium">
                  {formatNumber(metrics.period2.campaigns_count)} campanhas
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}