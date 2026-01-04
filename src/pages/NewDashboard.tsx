import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useTaskAutomation } from '@/hooks/useTaskAutomation';
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";
import { SyncStatusIndicator } from "@/components/clients/SyncStatusIndicator";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MyDayCard } from "@/components/dashboard/MyDayCard";
import { TeamHighlights } from "@/components/dashboard/TeamHighlights";
import { RecentCreativesCard } from "@/components/dashboard/RecentCreativesCard";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Bell,
} from "lucide-react";

export default function NewDashboard() {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const {
    metrics,
    clientsPerformance,
    campaignRankings,
    loading,
    refetch
  } = useDashboardData();

  const { clients } = useClients();
  const { syncCampaigns, syncing, progress } = useFacebookCampaignSync();

  // Hook para alertas automáticos
  const { alerts, loading: alertsLoading, generateAlerts } = useDashboardAlerts();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [convertedActions, setConvertedActions] = useState<Set<string>>(new Set());
  const [alertsGenerated, setAlertsGenerated] = useState(false);

  useEffect(() => {
    if (!loading && metrics && campaignRankings && clientsPerformance && !alertsGenerated) {
      setAlertsGenerated(true);
      generateAlerts();
    }
  }, [loading, metrics, campaignRankings, clientsPerformance, alertsGenerated, generateAlerts]);

  const getLastSyncInfo = () => {
    if (!clients || clients.length === 0) return null;
    
    const clientsWithSync = clients.filter(client => client.last_sync_at);
    if (clientsWithSync.length === 0) return null;

    const mostRecentSync = clientsWithSync.reduce((latest, client) => {
      return new Date(client.last_sync_at!) > new Date(latest.last_sync_at!) ? client : latest;
    });

    return {
      lastSyncAt: mostRecentSync.last_sync_at,
      lastSyncPeriod: mostRecentSync.last_sync_period || 'unknown'
    };
  };

  const lastSyncInfo = getLastSyncInfo();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const syncAllClientsLocal = async (options: SyncOptions) => {
    if (!clients || clients.length === 0) return;

    for (const client of clients) {
      if (client.ad_account_id) {
        await syncCampaigns(client.id, options.period, {
          campaigns: options.campaigns,
          adsets: options.adsets,
          ads: options.ads
        });
      }
    }
    
    await refetch();
  };

  const handleSyncConfirm = async (options: SyncOptions): Promise<string | null> => {
    setSyncDialogOpen(false);
    await syncAllClientsLocal(options);
    return null;
  };

  const handleConvertActionToTask = (alert: any) => {
    setConvertedActions(prev => new Set([...prev, alert.id]));
    convertAlertToTask(alert);
  };

  // Separar alertas por tipo
  const dangerAlerts = alerts.filter(alert => alert.type === 'danger' && !convertedActions.has(alert.id));
  const opportunityAlerts = alerts.filter(alert => alert.type === 'opportunity' && !convertedActions.has(alert.id));
  const criticalAlertsCount = dangerAlerts.length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-headline-lg text-foreground">Olá! 👋</h1>
          <p className="text-body-md text-muted-foreground mt-1">Confira as novidades e atividades recentes</p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <SyncStatusIndicator 
            lastSyncAt={lastSyncInfo?.lastSyncAt} 
            lastSyncPeriod={lastSyncInfo?.lastSyncPeriod}
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2 rounded-full px-4 h-9 text-body-md font-medium border-border hover:bg-secondary" 
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Quick Actions & My Day */}
        <div className="lg:col-span-3 space-y-6">
          <QuickActions />
          <MyDayCard />
        </div>

        {/* Center Column - Activity Feed */}
        <div className="lg:col-span-6">
          <ActivityFeed />
        </div>

        {/* Right Column - Stats & Highlights */}
        <div className="lg:col-span-3 space-y-6">
          {/* Mini KPIs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Investimento</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(metrics?.totalInvestment || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Leads</span>
                </div>
                <span className="text-sm font-semibold">{metrics?.totalLeads || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">CPA Médio</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(metrics?.averageCPA || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Summary */}
          {(criticalAlertsCount > 0 || opportunityAlerts.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalAlertsCount > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700 dark:text-red-400">Críticos</span>
                    </div>
                    <Badge variant="destructive">{criticalAlertsCount}</Badge>
                  </div>
                )}
                {opportunityAlerts.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-400">Oportunidades</span>
                    </div>
                    <Badge className="bg-green-500">{opportunityAlerts.length}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <RecentCreativesCard />
          <TeamHighlights />
        </div>
      </div>

      {/* Dialogs */}
      <SyncPeriodDialog 
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        onConfirm={handleSyncConfirm}
        title="Sincronizar Todos os Clientes"
      />

      <SyncProgressModal open={syncing} progress={progress} />
    </DashboardLayout>
  );
}
