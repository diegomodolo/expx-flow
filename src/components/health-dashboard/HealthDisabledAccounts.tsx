import { Ban, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthDisabledAccountsProps {
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

function getStatusBadge(status: string): { label: string; color: string } {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes("disabled") || statusLower.includes("desabilitad")) {
    return { label: "Desabilitada", color: "bg-destructive/20 text-destructive" };
  }
  if (statusLower.includes("blocked") || statusLower.includes("bloqueado")) {
    return { label: "Bloqueada", color: "bg-destructive/20 text-destructive" };
  }
  if (statusLower.includes("suspended") || statusLower.includes("suspend")) {
    return { label: "Suspensa", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" };
  }
  if (statusLower.includes("paused") || statusLower.includes("pausad")) {
    return { label: "Pausada", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" };
  }
  
  return { label: status, color: "bg-muted text-muted-foreground" };
}

export function HealthDisabledAccounts({ clients }: HealthDisabledAccountsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[400px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-destructive/10">
          <Ban className="h-4 w-4 text-destructive" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Contas com Problemas</h3>
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todas as contas OK!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {clients.map((client) => {
              const statusBadge = getStatusBadge(client.status);
              
              return (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-destructive/5 border-destructive/20"
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
                    <p className="text-xs text-muted-foreground truncate">
                      {client.statusExplanation || "Verificar conta de anúncios"}
                    </p>
                  </div>

                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    statusBadge.color
                  )}>
                    {statusBadge.label}
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
