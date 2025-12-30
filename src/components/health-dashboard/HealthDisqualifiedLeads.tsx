import { UserX, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DisqualifiedLeadClient } from "@/hooks/useHealthDashboard";

interface HealthDisqualifiedLeadsProps {
  clients: DisqualifiedLeadClient[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getSeverityConfig(count: number) {
  if (count >= 20) {
    return {
      bgClass: "bg-destructive/5 border-destructive/20",
      badgeClass: "bg-destructive/10 text-destructive",
      label: "Crítico",
    };
  }
  if (count >= 10) {
    return {
      bgClass: "bg-amber-500/5 border-amber-500/20",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      label: "Alto",
    };
  }
  return {
    bgClass: "bg-orange-500/5 border-orange-500/20",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    label: "Moderado",
  };
}

export function HealthDisqualifiedLeads({ clients }: HealthDisqualifiedLeadsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[340px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <UserX className="h-4 w-4 text-orange-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Leads Desqualificados</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3">Últimos 30 dias</p>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum report de lead desqualificado!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {clients.map((client, index) => {
              const config = getSeverityConfig(client.reportCount);
              
              return (
                <div
                  key={client.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    config.bgClass
                  )}
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  
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
                  </div>

                  <div className="text-right shrink-0">
                    <div className={cn(
                      "text-sm font-semibold px-2 py-1 rounded",
                      config.badgeClass
                    )}>
                      {client.reportCount} reports
                    </div>
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
