import { TVAlert } from "@/hooks/useTrafegoDashboard";
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Alertas</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-2 opacity-30" />
          <p>Nenhum alerta no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Alertas</h2>
        <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-sm font-medium">
          {alerts.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {alerts.map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl p-4 border-l-4 transition-all",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-base">{alert.title}</span>
                      <span className={cn("font-bold text-lg", config.iconColor)}>
                        {alert.value}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.clientName} • {alert.campaignName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
