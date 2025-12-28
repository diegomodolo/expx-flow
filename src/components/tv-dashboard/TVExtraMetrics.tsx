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
      label: "Campanhas Ativas",
      value: activeCampaigns.toString(),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Clientes Ativos",
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
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Métricas Adicionais</h2>
      </div>
      
      <div className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                "rounded-xl p-4 flex items-center gap-4",
                metric.bgColor
              )}
            >
              <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                <Icon className={cn("h-6 w-6", metric.color)} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className={cn("text-2xl font-bold", metric.color)}>
                  {metric.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
