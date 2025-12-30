import { RefreshCw, CheckCircle, Link2Off, Facebook } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthSyncAlertsProps {
  syncAlerts: ClientHealthData[];
  noAdAccountClients: ClientHealthData[];
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

// Google Ads icon (simple G)
function GoogleAdsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
  );
}

export function HealthSyncAlerts({ syncAlerts, noAdAccountClients }: HealthSyncAlertsProps) {
  const totalAlerts = syncAlerts.length + noAdAccountClients.length;
  const hasNoAccountAlerts = noAdAccountClients.length > 0;
  const hasSyncAlerts = syncAlerts.length > 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[400px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <RefreshCw className="h-4 w-4 text-purple-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Sincronização</h3>
      </div>

      {totalAlerts === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todas as contas sincronizadas!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {/* Seção: Sem Conta Vinculada */}
            {hasNoAccountAlerts && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2Off className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Sem Conta Vinculada ({noAdAccountClients.length})
                  </span>
                </div>
                {noAdAccountClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-amber-500/5 border-amber-500/20"
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

                    <div className="flex items-center gap-1.5">
                      <div 
                        className={cn(
                          "p-1 rounded",
                          !client.hasMetaAccount ? "bg-muted/50" : "bg-blue-500/10"
                        )}
                        title={client.hasMetaAccount ? "Meta Ads vinculado" : "Meta Ads não vinculado"}
                      >
                        <Facebook className={cn(
                          "h-3.5 w-3.5",
                          !client.hasMetaAccount ? "text-muted-foreground/50" : "text-blue-500"
                        )} />
                      </div>
                      <div 
                        className={cn(
                          "p-1 rounded",
                          !client.hasGoogleAccount ? "bg-muted/50" : "bg-red-500/10"
                        )}
                        title={client.hasGoogleAccount ? "Google Ads vinculado" : "Google Ads não vinculado"}
                      >
                        <GoogleAdsIcon className={cn(
                          "h-3.5 w-3.5",
                          !client.hasGoogleAccount ? "text-muted-foreground/50" : "text-red-500"
                        )} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Seção: Sem Sincronização Recente */}
            {hasSyncAlerts && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    Sem Sincronização Recente ({syncAlerts.length})
                  </span>
                </div>
                {syncAlerts.map((client) => {
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
                        <div className="flex items-center gap-1.5">
                          {client.hasMetaAccount && (
                            <div 
                              className="p-0.5 rounded bg-blue-500/10"
                              title="Meta Ads vinculado"
                            >
                              <Facebook className="h-3 w-3 text-blue-500" />
                            </div>
                          )}
                          {client.hasGoogleAccount && (
                            <div 
                              className="p-0.5 rounded bg-red-500/10"
                              title="Google Ads vinculado"
                            >
                              <GoogleAdsIcon className="h-3 w-3 text-red-500" />
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {client.activeCampaigns} campanha(s)
                          </span>
                        </div>
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
        </ScrollArea>
      )}
    </div>
  );
}
