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
import { TVExtraMetrics } from '@/components/tv-dashboard/TVExtraMetrics';
import { TVBudgetAlerts } from '@/components/tv-dashboard/TVBudgetAlerts';
import type { TVMetrics, TVAlert, TVCampaign, TVClient } from '@/hooks/useTrafegoDashboard';

interface TVDashboardResponse {
  company: {
    id: string;
    name: string;
  };
  lastSync: string;
  metrics: {
    totalInvestment: number;
    totalLeads: number;
    averageCPA: number;
    averageCTR: number;
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
    campaignName?: string;
    value?: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    clientName: string;
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
  }>;
  worstCampaigns: Array<{
    id: string;
    name: string;
    clientName: string;
    cpa: number;
    spend: number;
    conversions: number;
  }>;
  budgetAlerts: Array<{
    id: string;
    name: string;
    avatar: string | null;
    alertType: 'insufficient_balance' | 'over_budget';
    balance: number;
    spend: number;
    budget: number;
    daysRemaining: number;
    projectedSpend: number;
    percentage: number;
    message: string;
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

  const alerts: TVAlert[] = data.alerts.map(a => ({
    id: a.id,
    type: a.type === 'high_cpa' ? 'danger' : a.type === 'low_ctr' ? 'warning' : 'opportunity',
    title: a.title,
    description: a.description,
    clientName: a.clientName || 'Cliente',
    campaignName: a.campaignName || 'Campanha',
    metric: a.type === 'high_cpa' || a.type === 'scale_opportunity' ? 'CPA' : 'CTR',
    value: a.value || a.description,
  }));

  const campaigns: TVCampaign[] = data.campaigns.map(c => ({
    id: c.id,
    name: c.name,
    clientName: c.clientName || 'Cliente',
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with company name - compact */}
      <div className="bg-card border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">{data.company.name}</h1>
          <span className="text-xs text-muted-foreground">Dashboard TV</span>
        </div>
      </div>

      {/* Main Content - fills remaining space */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        {/* Row 1: KPI Header */}
        <div className="shrink-0">
          <TVKPIHeader metrics={metrics} lastSync={data.lastSync} />
        </div>

        {/* Row 2: Main Grid - Alerts, Campaign Ranking, Clients on Alert */}
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          <TVAlertsList alerts={alerts} />
          <TVCampaignRanking campaigns={campaigns} />
          <TVClientsOnAlert clients={clients} />
        </div>

        {/* Row 3: Budget Alerts, Top Clients, Worst Campaigns + Extra Metrics */}
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          <TVBudgetAlerts alerts={budgetAlerts} />
          <TVTopClients clients={topClients} />
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <TVWorstCampaigns campaigns={worstCampaigns} />
            </div>
            <div className="shrink-0">
              <TVExtraMetrics
                activeCampaigns={data.metrics.activeCampaigns || 0}
                activeClients={data.metrics.activeClients || 0}
                avgCPC={data.metrics.avgCPC || 0}
              />
            </div>
          </div>
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
