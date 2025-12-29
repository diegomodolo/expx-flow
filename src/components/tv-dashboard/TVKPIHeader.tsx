import { TVMetrics } from "@/hooks/useTrafegoDashboard";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, MousePointerClick, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncInfo {
  lastSyncAt: string | null;
  syncPeriod: number | null;
}

interface TVKPIHeaderProps {
  metrics: TVMetrics;
  lastSync: string;
  syncInfo?: SyncInfo;
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
    <div className="bg-card rounded-xl p-3 elevation-2 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-1">
        {change === 0 ? (
          <Minus className="h-3 w-3 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
        <span className={cn(
          "text-xs font-medium",
          change === 0 && "text-muted-foreground",
          isPositive && "text-green-500",
          isNegative && "text-red-500"
        )}>
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function formatSyncDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSyncPeriod(period: number | null): string {
  if (!period) return "—";
  return `${period} dias`;
}

export function TVKPIHeader({ metrics, lastSync, syncInfo }: TVKPIHeaderProps) {
  const syncTime = new Date(lastSync);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold">Dashboard de Tráfego</h1>
        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          {/* Sync info from Meta/Google */}
          {syncInfo && (
            <div className="flex items-center gap-3 bg-card/50 rounded-lg px-3 py-1.5 border border-border/50">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs">Última sync:</span>
                <span className="text-xs font-medium text-foreground">
                  {formatSyncDate(syncInfo.lastSyncAt)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs">Período:</span>
                <span className="text-xs font-medium text-foreground">
                  {formatSyncPeriod(syncInfo.syncPeriod)}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>Atualizado {syncTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="text-lg font-mono">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        <KPICard
          label="Investimento"
          value={formatCurrency(metrics.totalInvestment)}
          change={metrics.investmentChange}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          label="Leads"
          value={formatNumber(metrics.totalLeads)}
          change={metrics.leadsChange}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label="CPA Médio"
          value={`R$ ${metrics.averageCPA.toFixed(2)}`}
          change={metrics.cpaChange}
          icon={<Target className="h-4 w-4" />}
          invertColors
        />
        <KPICard
          label="CTR Médio"
          value={`${metrics.averageCTR.toFixed(2)}%`}
          change={metrics.ctrChange}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
