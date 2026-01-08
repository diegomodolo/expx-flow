import { AlertCircle, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Interface that works with both hook data and edge function data
interface ClientOnAlert {
  id: string;
  name: string;
  status: string;
  statusExplanation?: string | null;
  avatar?: string | null;
  isAccountRestricted?: boolean;
  accountRestrictionReason?: string;
}

interface TVClientsOnAlertProps {
  clients: ClientOnAlert[];
}

const statusConfig = {
  emergencia: {
    label: "Emergência",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-l-red-500",
  },
  red: {
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
  yellow: {
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
  restricted: {
    label: "Conta Restrita",
    icon: Ban,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-l-purple-500",
  },
};

// Extract first emoji or reason from status explanation
function extractReason(explanation: string | null): string {
  if (!explanation) return '';
  
  // Try to find the rule name after "Regra aplicada:"
  const ruleMatch = explanation.match(/Regra aplicada:\s*(.+?)(?:\n|$)/);
  if (ruleMatch) {
    return ruleMatch[1].trim();
  }
  
  // Fallback to first line
  const firstLine = explanation.split('\n')[0];
  return firstLine.replace(/[🚨⚫⚠️✅🟡🔴🟢]/g, '').trim().substring(0, 40);
}

export function TVClientsOnAlert({ clients }: TVClientsOnAlertProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 overflow-hidden">
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
    <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Clientes em Alerta</h2>
        <span className="ml-auto bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {clients.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-1 pr-1">
          {clients.slice(0, 8).map((client: any) => {
            // Use restricted config if account is restricted, otherwise use status config
            const isRestricted = client.isAccountRestricted === true;
            const config = isRestricted 
              ? statusConfig.restricted
              : (statusConfig[client.status as keyof typeof statusConfig] || statusConfig.atencao);
            const Icon = config.icon;
            
            // For restricted accounts, ALWAYS show the restriction reason prominently
            const reason = isRestricted 
              ? (client.accountRestrictionReason || 'Conta restrita') 
              : extractReason(client.statusExplanation);
            
            return (
              <div
                key={client.id}
                className={cn(
                  "rounded-lg p-2 flex items-center gap-2 border-l-4",
                  isRestricted ? "bg-purple-500/20 border-l-purple-500" : config.bg,
                  !isRestricted && config.border,
                  isRestricted && "ring-1 ring-purple-500/50"
                )}
              >
                {/* Avatar */}
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={client.avatar || undefined} alt={client.name} />
                  <AvatarFallback className={cn("text-[10px]", config.bg, config.color)}>
                    {client.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium truncate text-xs">{client.name}</p>
                    {isRestricted && (
                      <Ban className="h-3 w-3 text-purple-500 shrink-0" />
                    )}
                  </div>
                  {reason && (
                    <p className={cn(
                      "text-[10px] truncate",
                      isRestricted ? "text-purple-500 font-semibold" : "text-muted-foreground"
                    )}>
                      {isRestricted ? `⚠️ ${reason}` : reason}
                    </p>
                  )}
                </div>
                
                <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
