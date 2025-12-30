import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthKPIHeaderProps {
  totalClients: number;
  criticalCount: number;
  attentionCount: number;
  stableCount: number;
  averageScore: number;
  lastUpdate: string;
}

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "default" | "critical" | "warning" | "success";
}

function KPICard({ label, value, icon, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    critical: "bg-destructive/10 border-destructive/30",
    warning: "bg-yellow-500/10 border-yellow-500/30",
    success: "bg-green-500/10 border-green-500/30",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    critical: "text-destructive",
    warning: "text-yellow-500",
    success: "text-green-500",
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border",
      variantStyles[variant]
    )}>
      <div className={cn("p-2 rounded-lg bg-background/50", iconStyles[variant])}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return "--:--";
  }
}

export function HealthKPIHeader({
  totalClients,
  criticalCount,
  attentionCount,
  stableCount,
  averageScore,
  lastUpdate,
}: HealthKPIHeaderProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Radar de Saúde das Contas</h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento em tempo real • Atualizado às {formatTime(lastUpdate)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Auto-refresh: 5 min</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <KPICard
          label="Total de Clientes"
          value={totalClients}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
        <KPICard
          label="Críticos"
          value={criticalCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={criticalCount > 0 ? "critical" : "default"}
        />
        <KPICard
          label="Atenção"
          value={attentionCount}
          icon={<Clock className="h-5 w-5" />}
          variant={attentionCount > 0 ? "warning" : "default"}
        />
        <KPICard
          label="Estáveis"
          value={stableCount}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          label="Score Médio"
          value={`${averageScore}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={averageScore < 50 ? "critical" : averageScore < 70 ? "warning" : "success"}
        />
      </div>
    </div>
  );
}
