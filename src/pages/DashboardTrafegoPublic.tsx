import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { TVKPIHeader } from '@/components/tv-dashboard/TVKPIHeader';
import { TVAlertsList } from '@/components/tv-dashboard/TVAlertsList';
import { TVCampaignRanking } from '@/components/tv-dashboard/TVCampaignRanking';
import { TVTasksList } from '@/components/tv-dashboard/TVTasksList';
import { TVClientsOnAlert } from '@/components/tv-dashboard/TVClientsOnAlert';
import { TVControls } from '@/components/tv-dashboard/TVControls';
import type { TVMetrics, TVAlert, TVCampaign, TVTask, TVClient } from '@/hooks/useTrafegoDashboard';

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
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    spend: number;
    leads: number;
    cpa: number;
    ctr: number;
    status: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
    responsible: string;
  }>;
  clientsOnAlert: Array<{
    id: string;
    name: string;
    company: string;
    status: string;
    avatar: string | null;
    leads: number;
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
    clientName: 'Cliente',
    campaignName: a.title.split(': ')[1] || 'Campanha',
    metric: a.type === 'high_cpa' || a.type === 'scale_opportunity' ? 'CPA' : 'CTR',
    value: a.description,
  }));

  const campaigns: TVCampaign[] = data.campaigns.map(c => ({
    id: c.id,
    name: c.name,
    clientName: 'Cliente',
    clientId: '',
    spend: c.spend,
    conversions: c.leads,
    cpa: c.cpa,
    ctr: c.ctr,
    status: c.status,
  }));

  const tasks: TVTask[] = data.tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    clientName: t.responsible,
  }));

  const clients: TVClient[] = data.clientsOnAlert.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    statusExplanation: null,
    activeCampaigns: 0,
    avgCpl: c.leads,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header with company name */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{data.company.name}</h1>
          <span className="text-sm text-muted-foreground">Dashboard TV</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* KPI Header */}
        <TVKPIHeader metrics={metrics} lastSync={data.lastSync} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts and Tasks */}
          <div className="space-y-6">
            <TVAlertsList alerts={alerts} />
            <TVTasksList tasks={tasks} />
          </div>

          {/* Middle Column - Campaign Ranking */}
          <div>
            <TVCampaignRanking campaigns={campaigns} />
          </div>

          {/* Right Column - Clients on Alert */}
          <div>
            <TVClientsOnAlert clients={clients} />
          </div>
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
}
