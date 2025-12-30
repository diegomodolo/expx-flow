import { Wallet, AlertTriangle, TrendingDown, Clock, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthBalanceAlertsProps {
  clients: ClientHealthData[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusConfig(client: ClientHealthData) {
  if (client.balanceStatus === "insufficient") {
    return {
      icon: AlertTriangle,
      label: "Não vai durar",
      bgClass: "bg-destructive/5 border-destructive/20",
      textClass: "text-destructive",
      badgeClass: "bg-destructive/10 text-destructive",
    };
  }
  if (client.balanceStatus === "tight") {
    return {
      icon: TrendingDown,
      label: "Apertado",
      bgClass: "bg-amber-500/5 border-amber-500/20",
      textClass: "text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  }
  // Low balance but sufficient
  return {
    icon: Clock,
    label: "Saldo baixo",
    bgClass: "bg-yellow-500/5 border-yellow-500/20",
    textClass: "text-yellow-600 dark:text-yellow-400",
    badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  };
}

export function HealthBalanceAlerts({ clients }: HealthBalanceAlertsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[340px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-yellow-500/10">
          <Wallet className="h-4 w-4 text-yellow-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Alertas de Saldo</h3>
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todos os saldos OK!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {clients.map((client) => {
              const config = getStatusConfig(client);
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={client.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    config.bgClass
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatar || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Saldo: {client.balance !== null ? formatCurrency(client.balance) : "N/A"}</span>
                      {client.dailySpend !== null && (
                        <>
                          <span>•</span>
                          <span>{formatCurrency(client.dailySpend)}/dia</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                      config.badgeClass
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{config.label}</span>
                    </div>
                    {client.daysUntilRecharge !== null && client.balanceStatus !== "no-data" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.daysUntilRecharge} dias até recarga
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
