import { TVAlert } from "@/hooks/useTrafegoDashboard";
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TVAlertsListProps {
  alerts: TVAlert[];
}

const alertConfig = {
  danger: {
    icon: AlertTriangle,
    bgColor: "bg-red-500/10",
    borderColor: "border-l-red-500",
    iconColor: "text-red-500",
  },
  warning: {
    icon: TrendingDown,
    bgColor: "bg-yellow-500/10",
    borderColor: "border-l-yellow-500",
    iconColor: "text-yellow-500",
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: "bg-green-500/10",
    borderColor: "border-l-green-500",
    iconColor: "text-green-500",
  },
};

export function TVAlertsList({ alerts }: TVAlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Alertas</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-1 opacity-30" />
          <p className="text-xs">Nenhum alerta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Alertas</h2>
        <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs font-medium">
          {alerts.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1.5">
          {alerts.slice(0, 6).map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg p-2 border-l-2 transition-all",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs truncate">{alert.title}</span>
                      <span className={cn("font-bold text-xs shrink-0", config.iconColor)}>
                        {alert.value}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {alert.clientName} • {alert.campaignName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
