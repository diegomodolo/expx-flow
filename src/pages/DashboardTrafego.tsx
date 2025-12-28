import { useState } from "react";
import { useTrafegoDashboard } from "@/hooks/useTrafegoDashboard";
import { TVKPIHeader } from "@/components/tv-dashboard/TVKPIHeader";
import { TVAlertsList } from "@/components/tv-dashboard/TVAlertsList";
import { TVCampaignRanking } from "@/components/tv-dashboard/TVCampaignRanking";
import { TVTasksList } from "@/components/tv-dashboard/TVTasksList";
import { TVClientsOnAlert } from "@/components/tv-dashboard/TVClientsOnAlert";
import { TVControls } from "@/components/tv-dashboard/TVControls";
import { Loader2 } from "lucide-react";

export default function DashboardTrafego() {
  const [refreshInterval, setRefreshInterval] = useState(5 * 60 * 1000); // 5 min default
  const { data, isLoading, isFetching, refetch } = useTrafegoDashboard(refreshInterval);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header with KPIs */}
      <TVKPIHeader metrics={data.metrics} lastSync={data.lastSync} />
      
      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-6" style={{ height: "calc(100vh - 280px)" }}>
        {/* Left column - Alerts and Tasks */}
        <div className="col-span-3 flex flex-col gap-6">
          <div className="flex-1">
            <TVAlertsList alerts={data.alerts} />
          </div>
          <div className="flex-1">
            <TVTasksList tasks={data.pendingTasks} />
          </div>
        </div>
        
        {/* Center column - Campaign Ranking */}
        <div className="col-span-6">
          <TVCampaignRanking campaigns={data.topCampaigns} />
        </div>
        
        {/* Right column - Clients on Alert */}
        <div className="col-span-3">
          <TVClientsOnAlert clients={data.clientsOnAlert} />
        </div>
      </div>

      {/* Floating controls */}
      <TVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
      />
    </div>
  );
}
