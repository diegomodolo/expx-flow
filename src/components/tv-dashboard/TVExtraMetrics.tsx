import { Activity, Target, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TVExtraMetricsProps {
  activeCampaigns: number;
  activeClients: number;
  avgCPC: number;
}

export function TVExtraMetrics({ activeCampaigns, activeClients, avgCPC }: TVExtraMetricsProps) {
  const metrics = [
    {
      label: "Campanhas",
      value: activeCampaigns.toString(),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Clientes",
      value: activeClients.toString(),
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "CPC Médio",
      value: `R$ ${avgCPC.toFixed(2)}`,
      icon: Zap,
      color: avgCPC < 2 ? "text-green-500" : avgCPC < 5 ? "text-yellow-500" : "text-red-500",
      bgColor: avgCPC < 2 ? "bg-green-500/10" : avgCPC < 5 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Métricas</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                "rounded-lg p-2 flex flex-col items-center text-center",
                metric.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4 mb-1", metric.color)} />
              <p className={cn("text-lg font-bold", metric.color)}>
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
