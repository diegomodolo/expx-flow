import { TVClient } from "@/hooks/useTrafegoDashboard";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Clientes em Alerta</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-2 text-green-500 opacity-50" />
          <p>Todos os clientes estão bem!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Clientes em Alerta</h2>
        <span className="ml-auto bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-sm font-medium">
          {clients.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {clients.map((client) => {
            const config = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.atencao;
            const Icon = config.icon;
            
            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-xl p-4 flex items-center gap-3 border-l-4",
                  config.bg,
                  config.border
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.name}</p>
                  {client.statusExplanation && (
                    <p className="text-sm text-muted-foreground truncate">
                      {client.statusExplanation}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">CPL</p>
                  <p className={cn("font-bold", config.color)}>
                    R$ {client.avgCpl.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
