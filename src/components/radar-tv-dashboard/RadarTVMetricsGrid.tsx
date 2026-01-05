import { DollarSign, Users, TrendingUp, Target, Percent, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RadarMetrics {
  totalClients: number;
  clientsAtRisk: number;
  clientsWithOpportunities: number;
  criticalAlerts: number;
  warningAlerts: number;
  totalBudget: number;
  totalSpend: number;
  budgetUtilization: number;
  avgCPA: number;
  totalConversions: number;
}

interface RadarTVMetricsGridProps {
  metrics: RadarMetrics;
}

export function RadarTVMetricsGrid({ metrics }: RadarTVMetricsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const metricsData = [
    {
      label: 'Investimento Total',
      value: formatCurrency(metrics.totalSpend),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Orçamento Total',
      value: formatCurrency(metrics.totalBudget),
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Utilização',
      value: `${metrics.budgetUtilization.toFixed(0)}%`,
      icon: Percent,
      color: metrics.budgetUtilization > 100 ? 'text-destructive' : 
             metrics.budgetUtilization > 80 ? 'text-yellow-500' : 'text-green-500',
      bgColor: metrics.budgetUtilization > 100 ? 'bg-destructive/10' : 
               metrics.budgetUtilization > 80 ? 'bg-yellow-500/10' : 'bg-green-500/10'
    },
    {
      label: 'CPA Médio',
      value: formatCurrency(metrics.avgCPA),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Conversões',
      value: metrics.totalConversions.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Alertas Ativos',
      value: `${metrics.criticalAlerts + metrics.warningAlerts}`,
      icon: AlertCircle,
      color: metrics.criticalAlerts > 0 ? 'text-destructive' : 'text-yellow-500',
      bgColor: metrics.criticalAlerts > 0 ? 'bg-destructive/10' : 'bg-yellow-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                <Icon className={cn("h-5 w-5", metric.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className={cn("text-xl font-bold", metric.color)}>{metric.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
