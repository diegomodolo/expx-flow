import { Target, MousePointer, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TVConversionMetricsProps {
  conversionRate: number;
  totalClicks: number;
  totalLeads: number;
  avgFrequency: number;
}

export function TVConversionMetrics({ 
  conversionRate, 
  totalClicks, 
  totalLeads,
  avgFrequency 
}: TVConversionMetricsProps) {
  const metrics = [
    {
      label: "Taxa Conv.",
      value: `${conversionRate.toFixed(1)}%`,
      sublabel: "Leads/Cliques",
      icon: Target,
      color: conversionRate >= 5 ? "text-green-500" : conversionRate >= 2 ? "text-yellow-500" : "text-red-500",
      bgColor: conversionRate >= 5 ? "bg-green-500/10" : conversionRate >= 2 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
    {
      label: "Cliques",
      value: totalClicks >= 1000 ? `${(totalClicks / 1000).toFixed(1)}k` : totalClicks.toString(),
      sublabel: "Total",
      icon: MousePointer,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Leads",
      value: totalLeads.toString(),
      sublabel: "Total",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Frequência",
      value: avgFrequency.toFixed(1),
      sublabel: "Média",
      icon: Zap,
      color: avgFrequency <= 3 ? "text-green-500" : avgFrequency <= 5 ? "text-yellow-500" : "text-red-500",
      bgColor: avgFrequency <= 3 ? "bg-green-500/10" : avgFrequency <= 5 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Métricas de Conversão</h2>
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                "rounded-lg p-2 flex flex-col items-center justify-center text-center",
                metric.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4 mb-0.5", metric.color)} />
              <p className={cn("text-lg font-bold leading-tight", metric.color)}>
                {metric.value}
              </p>
              <p className="text-[9px] text-muted-foreground">{metric.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
