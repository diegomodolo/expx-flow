import { Wallet, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export function HealthBalanceAlerts({ clients }: HealthBalanceAlertsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-yellow-500/10">
          <Wallet className="h-4 w-4 text-yellow-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Alertas de Saldo</h3>
        {clients.length > 0 && (
          <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todos os saldos OK!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {clients.map((client) => {
            const isCritical = client.balance !== null && client.balance < 50;
            
            return (
              <div
                key={client.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border",
                  isCritical 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-yellow-500/5 border-yellow-500/20"
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
                  <p className="text-xs text-muted-foreground">
                    Pré-pago • {client.activeCampaigns} campanha(s)
                  </p>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-semibold",
                    isCritical ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"
                  )}>
                    {isCritical && <AlertTriangle className="h-3 w-3" />}
                    {client.balance !== null ? formatCurrency(client.balance) : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isCritical ? "Crítico" : "Baixo"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
