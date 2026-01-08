import { Ban, AlertCircle, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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

function getAccountStatusLabel(accountStatus: number | null): { label: string; color: string } {
  switch (accountStatus) {
    case 2:
      return { label: "Desabilitada", color: "bg-destructive/20 text-destructive" };
    case 3:
      return { label: "Pagamento Pendente", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" };
    case 7:
      return { label: "Em Análise", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" };
    case 8:
      return { label: "Liquidação Pendente", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" };
    case 100:
      return { label: "Fechamento Pendente", color: "bg-destructive/20 text-destructive" };
    case 101:
      return { label: "Encerrada", color: "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400" };
    default:
      return { label: "Restrita", color: "bg-zinc-800/20 text-zinc-800 dark:text-zinc-200" };
  }
}

export function HealthDisabledAccounts({ clients }: HealthDisabledAccountsProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[400px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-zinc-800/10 dark:bg-zinc-200/10">
          <ShieldAlert className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Contas Restritas</h3>
        {clients.length > 0 && (
          <span className="ml-auto text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma conta restrita!</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {clients.map((client) => {
              const statusBadge = getAccountStatusLabel(client.accountStatus);
              
              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clientes/${client.id}`)}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
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
                      Conta de anúncios com restrições ativas
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
