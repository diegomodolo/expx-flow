import { RefreshCw, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthSyncAlertsProps {
  clients: ClientHealthData[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDaysAgo(days: number): string {
  if (days === 1) return "1 dia";
  if (days < 30) return `${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mês" : `${months} meses`;
}

export function HealthSyncAlerts({ clients }: HealthSyncAlertsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <RefreshCw className="h-4 w-4 text-purple-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Sem Sincronização</h3>
        {clients.length > 0 && (
          <span className="ml-auto text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todas as contas sincronizadas!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {clients.map((client) => {
            const isCritical = client.lastSyncDaysAgo > 14;
            
            return (
              <div
                key={client.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border",
                  isCritical 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-purple-500/5 border-purple-500/20"
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
                    {client.activeCampaigns} campanha(s) ativa(s)
                  </p>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "text-xs font-medium",
                    isCritical 
                      ? "text-destructive" 
                      : "text-purple-600 dark:text-purple-400"
                  )}>
                    +{formatDaysAgo(client.lastSyncDaysAgo)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    sem sync
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
