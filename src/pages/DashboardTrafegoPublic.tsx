import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { TVKPIHeader } from '@/components/tv-dashboard/TVKPIHeader';
import { TVAlertsList } from '@/components/tv-dashboard/TVAlertsList';
import { TVCampaignRanking } from '@/components/tv-dashboard/TVCampaignRanking';
import { TVClientsOnAlert } from '@/components/tv-dashboard/TVClientsOnAlert';
import { TVControls } from '@/components/tv-dashboard/TVControls';
import { TVTopClients } from '@/components/tv-dashboard/TVTopClients';
import { TVWorstCampaigns } from '@/components/tv-dashboard/TVWorstCampaigns';
import { TVBudgetAlerts } from '@/components/tv-dashboard/TVBudgetAlerts';
import { TVPlatformChart } from '@/components/tv-dashboard/TVPlatformChart';
import { TVConversionMetrics } from '@/components/tv-dashboard/TVConversionMetrics';
import { TVInactiveClients } from '@/components/tv-dashboard/TVInactiveClients';
import type { TVMetrics, TVAlert, TVCampaign, TVClient } from '@/hooks/useTrafegoDashboard';

interface TVDashboardResponse {
  company: {
    id: string;
    name: string;
  };
  lastSync: string;
  syncInfo: {
    lastSyncAt: string | null;
    syncPeriod: number | null;
  };
  metrics: {
    totalInvestment: number;
    totalLeads: number;
    totalClicks: number;
    averageCPA: number;
    averageCTR: number;
    conversionRate: number;
    avgFrequency: number;
    activeCampaigns: number;
    activeClients: number;
    avgCPC: number;
    totalReach: number;
    investmentChange: number;
    leadsChange: number;
    cpaChange: number;
    ctrChange: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    campaignId?: string;
    clientName?: string;
    clientAvatar?: string | null;
    campaignName?: string;
    value?: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    clientName: string;
    clientAvatar?: string | null;
    clientId: string;
    spend: number;
    leads: number;
    cpa: number;
    ctr: number;
    status: string;
  }>;
  clientsOnAlert: Array<{
    id: string;
    name: string;
    company: string;
    status: string;
    statusExplanation?: string;
    avatar: string | null;
    leads: number;
    avgCpl: number;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    spend: number;
    conversions: number;
    cpa: number;
    campaigns: number;
    avatar?: string | null;
  }>;
  worstCampaigns: Array<{
    id: string;
    name: string;
    clientName: string;
    clientAvatar?: string | null;
    cpa: number;
    spend: number;
    conversions: number;
  }>;
  budgetAlerts: Array<{
    id: string;
    name: string;
    avatar: string | null;
    category: 'saldo' | 'gasto';
    severity: 'critical' | 'warning';
    balance: number;
    spend: number;
    budget: number;
    daysRemaining: number;
    projectedSpend: number;
    percentage: number;
    coveragePercentage: number;
    message: string;
    platform: string;
  }>;
  platformData: Array<{
    platform: string;
    spend: number;
    percentage: number;
  }>;
  inactiveClients: Array<{
    id: string;
    name: string;
    avatar: string | null;
    activeCampaigns: number;
  }>;
}

export default function DashboardTrafegoPublic() {
  const { token } = useParams<{ token: string }>();
  const [refreshInterval, setRefreshInterval] = useState(5 * 60 * 1000); // 5 minutes in ms

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['tv-dashboard-public', token],
    queryFn: async (): Promise<TVDashboardResponse> => {
      const response = await fetch(
        `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/tv-dashboard-data?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar dados');
      }

      return response.json();
    },
    refetchInterval: refreshInterval,
    enabled: !!token,
    staleTime: 60000,
  });

  // Set page title
  useEffect(() => {
    if (data?.company?.name) {
      document.title = `Dashboard TV - ${data.company.name}`;
    }
  }, [data?.company?.name]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Token não fornecido</h1>
          <p className="text-muted-foreground">Por favor, acesse o dashboard através de um link válido.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Carregando dashboard...</p>
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

  // Transform data for components - matching the expected types
  const metrics: TVMetrics = {
    totalInvestment: data.metrics.totalInvestment,
    totalLeads: data.metrics.totalLeads,
    averageCPA: data.metrics.averageCPA,
    averageCTR: data.metrics.averageCTR,
    mqlRate: 0,
    investmentChange: data.metrics.investmentChange,
    leadsChange: data.metrics.leadsChange,
    cpaChange: data.metrics.cpaChange,
    ctrChange: data.metrics.ctrChange,
  };

  const alerts: Array<TVAlert & { clientAvatar?: string | null }> = data.alerts.map(a => {
    const type: TVAlert['type'] =
      a.type === 'high_cpa' ? 'danger' : a.type === 'low_ctr' ? 'warning' : 'opportunity';

    return {
      id: a.id,
      type,
      title: a.title,
      description: a.description,
      clientName: a.clientName || 'Cliente',
      clientAvatar: a.clientAvatar || null,
      campaignName: a.campaignName || 'Campanha',
      metric: a.type === 'high_cpa' || a.type === 'scale_opportunity' ? 'CPA' : 'CTR',
      value: a.value || a.description,
    };
  });

  const campaigns = data.campaigns.map(c => ({
    id: c.id,
    name: c.name,
    clientName: c.clientName || 'Cliente',
    clientAvatar: c.clientAvatar || null,
    clientId: c.clientId || '',
    spend: c.spend,
    conversions: c.leads,
    cpa: c.cpa,
    ctr: c.ctr,
    status: c.status,
  }));

  const clients: TVClient[] = data.clientsOnAlert.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    statusExplanation: c.statusExplanation || null,
    activeCampaigns: 0,
    avgCpl: c.avgCpl || 0,
    avatar: c.avatar || null,
  }));

  const topClients = data.topClients || [];
  const worstCampaigns = data.worstCampaigns || [];
  const budgetAlerts = data.budgetAlerts || [];
  const platformData = data.platformData || [];
  const inactiveClients = data.inactiveClients || [];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with company name - compact */}
      <div className="bg-card border-b border-border px-4 py-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">{data.company.name}</h1>
          <span className="text-xs text-muted-foreground">Dashboard TV</span>
        </div>
      </div>

      {/* Main Content - fills remaining space */}
      <div className="flex-1 p-2 flex flex-col gap-2 overflow-hidden">
        {/* Row 1: KPI Header */}
        <div className="shrink-0">
          <TVKPIHeader 
            metrics={metrics} 
            lastSync={data.lastSync} 
            syncInfo={data.syncInfo}
          />
        </div>

        {/* Row 2: Alerts, Campaign Ranking, Clients on Alert */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
          <TVAlertsList alerts={alerts} />
          <TVCampaignRanking campaigns={campaigns} />
          <TVClientsOnAlert clients={clients} />
        </div>

        {/* Row 3: Budget Alerts, Top Clients, Worst Campaigns */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
          <TVBudgetAlerts alerts={budgetAlerts} />
          <TVTopClients clients={topClients} />
          <TVWorstCampaigns campaigns={worstCampaigns} />
        </div>

        {/* Row 4: Platform Chart, Conversion Metrics, Inactive Clients */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
          <TVPlatformChart data={platformData} />
          <TVConversionMetrics 
            conversionRate={data.metrics.conversionRate || 0}
            totalClicks={data.metrics.totalClicks || 0}
            totalLeads={data.metrics.totalLeads || 0}
            avgFrequency={data.metrics.avgFrequency || 0}
          />
          <TVInactiveClients clients={inactiveClients} />
        </div>
      </div>

      {/* TV Controls - floating */}
      <TVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
      />
    </div>
  );
}
