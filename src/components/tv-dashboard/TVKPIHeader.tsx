import { TVMetrics } from "@/hooks/useTrafegoDashboard";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface TVKPIHeaderProps {
  metrics: TVMetrics;
  lastSync: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  invertColors?: boolean; // For CPA, lower is better
}

function KPICard({ label, value, change, icon, invertColors }: KPICardProps) {
  const isPositive = invertColors ? change < 0 : change > 0;
  const isNegative = invertColors ? change > 0 : change < 0;
  
  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-lg font-medium">{label}</span>
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <div className="text-4xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-1">
        {change === 0 ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={cn(
          "text-sm font-medium",
          change === 0 && "text-muted-foreground",
          isPositive && "text-green-500",
          isNegative && "text-red-500"
        )}>
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
        <span className="text-muted-foreground text-sm ml-1">vs período anterior</span>
      </div>
    </div>
  );
}

export function TVKPIHeader({ metrics, lastSync }: TVKPIHeaderProps) {
  const syncTime = new Date(lastSync);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-3xl font-bold">Dashboard de Tráfego</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Atualizado às {syncTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="text-2xl font-mono">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Investimento Total"
          value={formatCurrency(metrics.totalInvestment)}
          change={metrics.investmentChange}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <KPICard
          label="Leads Gerados"
          value={formatNumber(metrics.totalLeads)}
          change={metrics.leadsChange}
          icon={<Users className="h-6 w-6" />}
        />
        <KPICard
          label="CPA Médio"
          value={`R$ ${metrics.averageCPA.toFixed(2)}`}
          change={metrics.cpaChange}
          icon={<Target className="h-6 w-6" />}
          invertColors
        />
        <KPICard
          label="CTR Médio"
          value={`${metrics.averageCTR.toFixed(2)}%`}
          change={metrics.ctrChange}
          icon={<MousePointerClick className="h-6 w-6" />}
        />
      </div>
    </div>
  );
}
