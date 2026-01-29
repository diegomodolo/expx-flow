import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSTVHeader } from "@/components/cs-tv-dashboard/CSTVHeader";
import { CSTVHealthMetrics } from "@/components/cs-tv-dashboard/CSTVHealthMetrics";
import { CSTVWhatsAppSentiment } from "@/components/cs-tv-dashboard/CSTVWhatsAppSentiment";
import { CSTVCriticalClients } from "@/components/cs-tv-dashboard/CSTVCriticalClients";
import { CSTVCriticalConversations } from "@/components/cs-tv-dashboard/CSTVCriticalConversations";
import { CSTVPendingActions } from "@/components/cs-tv-dashboard/CSTVPendingActions";
import { CSTVControls } from "@/components/cs-tv-dashboard/CSTVControls";
import { supabasePublic } from "@/integrations/supabase/publicClient";

interface CSTVDashboardData {
  companyName: string;
  lastUpdatedAt: string;
  healthMetrics: {
    averageHealthScore: number;
    totalClients: number;
    criticalClients: number;
    highRiskClients: number;
    mediumRiskClients: number;
    lowRiskClients: number;
    averageNPS: number | null;
    npsPromoters: number;
    npsPassives: number;
    npsDetractors: number;
  };
  whatsappSentiment: {
    totalConversations: number;
    positiveConversations: number;
    neutralConversations: number;
    negativeConversations: number;
    averageScore: number | null;
    activeAlerts: number;
  };
  criticalClients: Array<{
    id: string;
    name: string;
    avatar: string | null;
    healthScore: number | null;
    riskLevel: string;
    financialScore: number | null;
    operationalScore: number | null;
    relationalScore: number | null;
    npsScore: number | null;
    lastCsContact: string | null;
  }>;
  criticalConversations: Array<{
    id: string;
    contactName: string;
    clientId: string | null;
    clientName: string | null;
    score: number | null;
    temperature: string | null;
    alertsCount: number;
    lastAnalysis: string | null;
  }>;
  pendingContacts: Array<{
    id: string;
    name: string;
    avatar: string | null;
    daysSinceContact: number;
    lastContactAt: string | null;
  }>;
  pendingNPS: Array<{
    id: string;
    name: string;
    avatar: string | null;
    daysSinceNPS: number;
    lastNPSAt: string | null;
  }>;
}

export default function DashboardCSTVPublic() {
  const { token } = useParams<{ token: string }>();
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('cs-tv-refresh-interval');
    return saved ? parseInt(saved) : 300000; // 5 minutes default
  });
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('cs-tv-zoom');
    return saved ? parseInt(saved) : 100;
  });
  const [rotation, setRotation] = useState(() => {
    const saved = localStorage.getItem('cs-tv-rotation');
    return saved ? parseInt(saved) : 0;
  });

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    localStorage.setItem('cs-tv-zoom', newZoom.toString());
  };

  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
    localStorage.setItem('cs-tv-rotation', newRotation.toString());
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<CSTVDashboardData>({
    queryKey: ['cs-tv-dashboard', token],
    queryFn: async () => {
      const { data, error } = await supabasePublic.functions.invoke('cs-tv-dashboard-data', {
        body: { token: token! },
      });

      if (error) {
        let message = error.message || 'Erro ao carregar dados';

        const ctx = (error as any)?.context;
        if (ctx) {
          try {
            const errorData = await ctx.json();
            message = errorData?.error || message;
          } catch {
            // ignore parse errors
          }
        }

        throw new Error(message);
      }

      return data as CSTVDashboardData;
    },
    enabled: !!token,
    refetchInterval: refreshInterval,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.companyName) {
      document.title = `CS TV - ${data.companyName}`;
    }
  }, [data?.companyName]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
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
          <p className="text-muted-foreground">Carregando CS Dashboard...</p>
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

  const isRotated = rotation === 90 || rotation === 270;

  return (
    <div 
      className="min-h-screen bg-background overflow-hidden"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: rotation === 90 ? 'top left' : rotation === 270 ? 'bottom right' : 'center',
        width: isRotated ? '100vh' : '100%',
        height: isRotated ? '100vw' : '100%',
        position: isRotated ? 'absolute' : 'relative',
        top: rotation === 90 ? 0 : rotation === 270 ? 'auto' : undefined,
        left: rotation === 90 ? '100vw' : undefined,
        bottom: rotation === 270 ? '100vh' : undefined,
        right: rotation === 270 ? 0 : undefined,
      }}
    >
      <div 
        className="p-6 space-y-6 origin-top-left"
        style={{ 
          transform: `scale(${zoom / 100})`,
          width: `${10000 / zoom}%`
        }}
      >
        <CSTVHeader 
          companyName={data.companyName}
          lastUpdatedAt={data.lastUpdatedAt}
        />

        <CSTVHealthMetrics metrics={data.healthMetrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CSTVWhatsAppSentiment sentiment={data.whatsappSentiment} />
          <CSTVCriticalClients clients={data.criticalClients} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CSTVCriticalConversations conversations={data.criticalConversations} />
          <CSTVPendingActions 
            pendingContacts={data.pendingContacts}
            pendingNPS={data.pendingNPS}
          />
        </div>
      </div>

      <CSTVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={(interval) => {
          setRefreshInterval(interval);
          localStorage.setItem('cs-tv-refresh-interval', interval.toString());
        }}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        rotation={rotation}
        onRotationChange={handleRotationChange}
      />
    </div>
  );
}
