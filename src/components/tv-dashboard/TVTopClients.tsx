import { Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Top Clientes</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <Users className="h-8 w-8 mb-1 opacity-30" />
          <p className="text-xs">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Top 5 Clientes</h2>
        <span className="text-muted-foreground text-[10px] ml-1">(menor CPA)</span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1">
          {clients.slice(0, 5).map((client, index) => {
            const isTop3 = index < 3;
            const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
            
            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-lg p-2 flex items-center gap-2 transition-all",
                  isTop3 ? "bg-primary/5" : "bg-muted/50"
                )}
              >
                <div className={cn(
                  "text-sm font-bold w-5 text-center",
                  isTop3 ? medalColors[index] : "text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{client.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {client.campaigns} campanhas
                  </p>
                </div>
                
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">CPA</p>
                    <p className={cn(
                      "font-bold text-xs",
                      client.cpa < 30 ? "text-green-500" : 
                      client.cpa < 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      R$ {client.cpa.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Leads</p>
                    <p className="font-bold text-xs">{client.conversions}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
