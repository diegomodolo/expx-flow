import { TVClient } from "@/hooks/useTrafegoDashboard";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TVClientsOnAlertProps {
  clients: TVClient[];
}

const statusConfig = {
  emergencia: {
    label: "Emergência",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-l-red-500",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-l-yellow-500",
  },
  excelente: {
    label: "Excelente",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-l-green-500",
  },
};

export function TVClientsOnAlert({ clients }: TVClientsOnAlertProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Clientes em Alerta</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mb-1 text-green-500 opacity-50" />
          <p className="text-xs">Todos os clientes estão bem!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Clientes em Alerta</h2>
        <span className="ml-auto bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {clients.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1">
          {clients.slice(0, 5).map((client) => {
            const config = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.atencao;
            const Icon = config.icon;
            
            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-lg p-2 flex items-center gap-2 border-l-2",
                  config.bg,
                  config.border
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{client.name}</p>
                  {client.statusExplanation && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {client.statusExplanation}
                    </p>
                  )}
                </div>
                
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-muted-foreground">CPL</p>
                  <p className={cn("font-bold text-xs", config.color)}>
                    R$ {client.avgCpl.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
