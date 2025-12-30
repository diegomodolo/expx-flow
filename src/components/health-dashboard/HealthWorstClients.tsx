import { TrendingDown, AlertTriangle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ClientHealthData } from "@/hooks/useHealthDashboard";

interface HealthWorstClientsProps {
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

function getScoreColor(score: number): string {
  if (score < 40) return "text-destructive";
  if (score < 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function getProgressColor(score: number): string {
  if (score < 40) return "bg-destructive";
  if (score < 70) return "bg-yellow-500";
  return "bg-green-500";
}

function getRiskIcon(riskLevel: "critical" | "attention" | "stable") {
  if (riskLevel === "critical") {
    return <AlertTriangle className="h-3 w-3 text-destructive" />;
  }
  if (riskLevel === "attention") {
    return <Clock className="h-3 w-3 text-yellow-500" />;
  }
  return null;
}

export function HealthWorstClients({ clients }: HealthWorstClientsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-destructive/10">
          <TrendingDown className="h-4 w-4 text-destructive" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Piores Scores de Saúde</h3>
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <TrendingDown className="h-5 w-5 text-green-500 rotate-180" />
            </div>
            <p className="text-sm text-muted-foreground">Todos os clientes saudáveis!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {clients.map((client, index) => (
            <div
              key={client.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border",
                client.riskLevel === "critical" 
                  ? "bg-destructive/5 border-destructive/20" 
                  : "bg-yellow-500/5 border-yellow-500/20"
              )}
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {index + 1}
              </div>
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={client.avatar || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {getRiskIcon(client.riskLevel)}
                  <p className="text-sm font-medium text-foreground truncate">
                    {client.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {client.riskFactors[0] || "Verificar conta"}
                </p>
              </div>

              <div className="w-20 text-right">
                <div className={cn("text-sm font-bold", getScoreColor(client.healthScore))}>
                  {client.healthScore}%
                </div>
                <div className="h-1.5 mt-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", getProgressColor(client.healthScore))}
                    style={{ width: `${client.healthScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
