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
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";

const RadarSaude = () => {
  const { data, isLoading, error, isFetching, refetch } = useHealthDashboard();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Carregando dashboard de saúde...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Erro ao carregar dashboard</h1>
            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header com título e botão de refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Radar de Saúde</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral da saúde dos clientes
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* KPI Header */}
        <HealthKPIHeader
          totalClients={data.totalClients}
          criticalCount={data.criticalCount}
          attentionCount={data.attentionCount}
          stableCount={data.stableCount}
          averageScore={data.averageScore}
          lastUpdate={data.lastUpdate}
        />

        {/* Row 1: Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <HealthBalanceAlerts clients={data.balanceAlerts} />
          <HealthDisabledAccounts clients={data.disabledAccounts} />
          <HealthInactiveClients clients={data.inactiveClients} />
        </div>

        {/* Row 2: Sync, Worst Clients, Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <HealthSyncAlerts 
            syncAlerts={data.syncAlerts} 
            noAdAccountClients={data.noAdAccountClients} 
          />
          <HealthWorstClients clients={data.worstClients} />
          <HealthTasksList tasks={data.pendingTasks} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RadarSaude;
