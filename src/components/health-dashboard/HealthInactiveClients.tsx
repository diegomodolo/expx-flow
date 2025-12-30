import { PauseCircle, PlayCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthInactiveClientsProps {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function HealthInactiveClients({ clients }: HealthInactiveClientsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[340px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <PauseCircle className="h-4 w-4 text-orange-500" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Sem Campanhas Ativas</h3>
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <PlayCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Todos os clientes com campanhas ativas!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-orange-500/5 border-orange-500/20"
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
                    {client.monthlyBudget 
                      ? `Budget: ${formatCurrency(client.monthlyBudget)}/mês` 
                      : "Sem budget definido"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    0 campanhas
                  </div>
                  <p className="text-xs text-muted-foreground">
                    inativas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
