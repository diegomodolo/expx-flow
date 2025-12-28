import { Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TopClient {
  id: string;
  name: string;
  spend: number;
  conversions: number;
  cpa: number;
  campaigns: number;
}

interface TVTopClientsProps {
  clients: TopClient[];
}

export function TVTopClients({ clients }: TVTopClientsProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Top Clientes</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Users className="h-10 w-10 mb-2 opacity-30" />
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Top 5 Clientes</h2>
        <span className="text-muted-foreground text-sm ml-2">(menor CPA)</span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {clients.map((client, index) => {
            const isTop3 = index < 3;
            const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
            
            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-xl p-4 flex items-center gap-4 transition-all",
                  isTop3 ? "bg-primary/5" : "bg-muted/50"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "text-2xl font-bold w-8 text-center",
                  isTop3 ? medalColors[index] : "text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-base">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.campaigns} campanhas ativas
                  </p>
                </div>
                
                {/* Metrics */}
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">CPA</p>
                    <p className={cn(
                      "font-bold text-lg",
                      client.cpa < 30 ? "text-green-500" : 
                      client.cpa < 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      R$ {client.cpa.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Leads</p>
                    <p className="font-bold text-lg">{client.conversions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Invest.</p>
                    <p className="font-medium text-base text-muted-foreground">
                      R$ {client.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
