import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useHealthDashboard } from "@/hooks/useHealthDashboard";
import { HealthKPIHeader } from "@/components/health-dashboard/HealthKPIHeader";
import { HealthBalanceAlerts } from "@/components/health-dashboard/HealthBalanceAlerts";
import { HealthDisabledAccounts } from "@/components/health-dashboard/HealthDisabledAccounts";
import { HealthInactiveClients } from "@/components/health-dashboard/HealthInactiveClients";
import { HealthSyncAlerts } from "@/components/health-dashboard/HealthSyncAlerts";
import { HealthWorstClients } from "@/components/health-dashboard/HealthWorstClients";
import { HealthTasksList } from "@/components/health-dashboard/HealthTasksList";
import { TVControls } from "@/components/tv-dashboard/TVControls";

const RadarSaude = () => {
  const [refreshInterval, setRefreshInterval] = useState(5 * 60 * 1000);
  const { data, isLoading, error, isFetching, refetch } = useHealthDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Carregando dashboard de saúde...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro ao carregar dashboard</h1>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        {/* Row 1: KPI Header */}
        <div className="shrink-0">
          <HealthKPIHeader
            totalClients={data.totalClients}
            criticalCount={data.criticalCount}
            attentionCount={data.attentionCount}
            stableCount={data.stableCount}
            averageScore={data.averageScore}
            lastUpdate={data.lastUpdate}
          />
        </div>

        {/* Row 2: Alerts */}
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          <HealthBalanceAlerts clients={data.balanceAlerts} />
          <HealthDisabledAccounts clients={data.disabledAccounts} />
          <HealthInactiveClients clients={data.inactiveClients} />
        </div>

        {/* Row 3: Sync, Worst Clients, Tasks */}
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          <HealthSyncAlerts clients={data.syncAlerts} />
          <HealthWorstClients clients={data.worstClients} />
          <HealthTasksList tasks={data.pendingTasks} />
        </div>
      </div>

      {/* TV Controls */}
      <TVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
      />
    </div>
  );
};

export default RadarSaude;
