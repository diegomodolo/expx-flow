import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadarTVHeader } from "@/components/radar-tv-dashboard/RadarTVHeader";
import { RadarTVMetricsGrid } from "@/components/radar-tv-dashboard/RadarTVMetricsGrid";
import { RadarTVRisksList } from "@/components/radar-tv-dashboard/RadarTVRisksList";
import { RadarTVOpportunitiesList } from "@/components/radar-tv-dashboard/RadarTVOpportunitiesList";
import { RadarTVRiskDistribution } from "@/components/radar-tv-dashboard/RadarTVRiskDistribution";
import { RadarTVControls } from "@/components/radar-tv-dashboard/RadarTVControls";

interface RadarTVDashboardData {
  companyName: string;
  lastSyncAt: string | null;
  syncPeriod: string | null;
  metrics: {
    totalClients: number;
    clientsAtRisk: number;
    clientsWithOpportunities: number;
    criticalAlerts: number;
    warningAlerts: number;
    totalBudget: number;
    totalSpend: number;
    budgetUtilization: number;
    avgCPA: number;
    totalConversions: number;
  };
  risks: Array<{
    id: string;
    name: string;
    avatar: string | null;
    riskType: 'performance' | 'budget' | 'balance' | 'inactive';
    severity: 'critical' | 'warning';
    message: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  opportunities: Array<{
    id: string;
    name: string;
    avatar: string | null;
    opportunityType: 'scale' | 'optimization' | 'expansion';
    message: string;
    potentialGain: string;
    currentValue: string;
  }>;
  riskDistribution: {
    performance: number;
    budget: number;
    balance: number;
    inactive: number;
  };
}

export default function DashboardRadarTVPublic() {
  const { token } = useParams<{ token: string }>();
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('radar-tv-refresh-interval');
    return saved ? parseInt(saved) : 300000; // 5 minutes default
  });
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('radar-tv-zoom');
    return saved ? parseInt(saved) : 100;
  });

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    localStorage.setItem('radar-tv-zoom', newZoom.toString());
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<RadarTVDashboardData>({
    queryKey: ['radar-tv-dashboard', token],
    queryFn: async () => {
      const response = await fetch(
        `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/radar-tv-dashboard-data?token=${token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar dados');
      }
      
      return response.json();
    },
    enabled: !!token,
    refetchInterval: refreshInterval,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.companyName) {
      document.title = `Radar TV - ${data.companyName}`;
    }
  }, [data?.companyName]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Radar className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Token não fornecido</h1>
          <p className="text-muted-foreground">
            Acesse este dashboard através do link gerado nas configurações.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando radar...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Erro ao carregar dados</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Token inválido ou expirado'}
          </p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="p-6 space-y-6 origin-top-left"
        style={{ 
          transform: `scale(${zoom / 100})`,
          width: `${10000 / zoom}%`
        }}
      >
        <RadarTVHeader 
          companyName={data.companyName}
          lastSyncAt={data.lastSyncAt}
          metrics={data.metrics}
        />

        <RadarTVMetricsGrid metrics={data.metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RadarTVRisksList risks={data.risks} />
          </div>
          <div>
            <RadarTVRiskDistribution distribution={data.riskDistribution} />
          </div>
        </div>

        <RadarTVOpportunitiesList opportunities={data.opportunities} />
      </div>

      <RadarTVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={(interval) => {
          setRefreshInterval(interval);
          localStorage.setItem('radar-tv-refresh-interval', interval.toString());
        }}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
        zoom={zoom}
        onZoomChange={handleZoomChange}
      />
    </div>
  );
}
