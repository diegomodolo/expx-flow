import { UserX, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InactiveClient {
  id: string;
  name: string;
  avatar: string | null;
  activeCampaigns: number;
}

interface TVInactiveClientsProps {
  clients: InactiveClient[];
}

export function TVInactiveClients({ clients }: TVInactiveClientsProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <UserX className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Clientes sem Campanhas</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mb-1 text-green-500 opacity-50" />
          <p className="text-xs">Todos os clientes têm campanhas!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <UserX className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold">Sem Campanhas Ativas</h2>
        <span className="ml-auto bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {clients.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1">
          {clients.slice(0, 6).map((client) => (
            <div
              key={client.id}
              className="rounded-lg p-2 flex items-center gap-2 bg-orange-500/5 border-l-2 border-l-orange-500"
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={client.avatar || undefined} alt={client.name} />
                <AvatarFallback className="text-[9px] bg-orange-500/10 text-orange-500">
                  {client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-xs">{client.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  Nenhuma campanha ativa
                </p>
              </div>
              
              <UserX className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
