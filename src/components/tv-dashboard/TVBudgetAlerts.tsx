import { Wallet, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BudgetAlert {
  id: string;
  name: string;
  avatar: string | null;
  category: 'saldo' | 'gasto';
  severity: 'critical' | 'warning';
  balance: number;
  spend: number;
  budget: number;
  daysRemaining: number;
  projectedSpend: number;
  percentage: number;
  coveragePercentage: number;
  message: string;
  platform: string;
}

interface TVBudgetAlertsProps {
  alerts: BudgetAlert[];
}

export function TVBudgetAlerts({ alerts }: TVBudgetAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Alertas de Saldo</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mb-1 text-green-500 opacity-50" />
          <p className="text-xs">Todos os saldos OK!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Alertas de Saldo</h2>
        <span className="ml-auto bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {alerts.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-1 pr-1">
          {alerts.slice(0, 6).map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isGasto = alert.category === 'gasto';
            
            // Colors based on severity
            const bgColor = isCritical ? 'bg-red-500/10' : 'bg-amber-500/10';
            const borderColor = isCritical ? 'border-l-red-500' : 'border-l-amber-500';
            const iconColor = isCritical ? 'text-red-500' : 'text-amber-500';
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg p-2 flex items-center gap-2 border-l-2",
                  bgColor,
                  borderColor
                )}
              >
                {/* Avatar */}
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={alert.avatar || undefined} alt={alert.name} />
                  <AvatarFallback className={cn("text-[10px]", bgColor, iconColor)}>
                    {alert.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium truncate text-xs">{alert.name}</p>
                    <span className={cn(
                      "text-[8px] px-1 py-0.5 rounded font-medium shrink-0",
                      isGasto ? "bg-orange-500/20 text-orange-600" : "bg-blue-500/20 text-blue-600"
                    )}>
                      {isGasto ? 'Gasto' : 'Saldo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {alert.platform} • {alert.message}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  {isGasto ? (
                    <>
                      <p className="text-[9px] text-muted-foreground">Gasto</p>
                      <p className={cn("font-bold text-xs", iconColor)}>
                        {alert.percentage.toFixed(0)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[9px] text-muted-foreground">Saldo</p>
                      <p className={cn("font-bold text-xs", iconColor)}>
                        R$ {alert.balance.toFixed(0)}
                      </p>
                    </>
                  )}
                </div>
                
                {isGasto ? (
                  <TrendingUp className={cn("h-4 w-4 shrink-0", iconColor)} />
                ) : (
                  <AlertCircle className={cn("h-4 w-4 shrink-0", iconColor)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
