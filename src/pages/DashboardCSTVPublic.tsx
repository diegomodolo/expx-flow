import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSTVHeader } from "@/components/cs-tv-dashboard/CSTVHeader";
import { CSTVWhatsAppMetrics } from "@/components/cs-tv-dashboard/CSTVWhatsAppMetrics";
import { CSTVSentimentBar } from "@/components/cs-tv-dashboard/CSTVSentimentBar";
import { CSTVCriticalConversations } from "@/components/cs-tv-dashboard/CSTVCriticalConversations";
import { CSTVPendingConversations } from "@/components/cs-tv-dashboard/CSTVPendingConversations";
import { CSTVAttendantPerformance } from "@/components/cs-tv-dashboard/CSTVAttendantPerformance";
import { CSTVMessageVolume } from "@/components/cs-tv-dashboard/CSTVMessageVolume";
import { CSTVResponseTimeBreakdown } from "@/components/cs-tv-dashboard/CSTVResponseTimeBreakdown";
import { CSTVControls } from "@/components/cs-tv-dashboard/CSTVControls";
import { CSTVCriticalAlertOverlay, CriticalAlert } from "@/components/cs-tv-dashboard/CSTVCriticalAlertOverlay";
import { CSTVCelebrationOverlay, CelebrationAlert } from "@/components/cs-tv-dashboard/CSTVCelebrationOverlay";
import { supabasePublic } from "@/integrations/supabase/publicClient";

interface AttendantPerformance {
  id: string;
  name: string;
  avatarUrl: string | null;
  activeConversations: number;
  averageScore: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  activeAlerts: number;
  messagesSent: number;
  averageResponseTimeMinutes: number | null;
  averageFirstResponseTimeMinutes: number | null;
}

interface CSTVDashboardData {
  companyName: string;
  lastUpdatedAt: string;
  whatsappMetrics: {
    totalConversations: number;
    activeConversations: number;
    positiveConversations: number;
    neutralConversations: number;
    negativeConversations: number;
    averageScore: number | null;
    activeAlerts: number;
    averageResponseTimeMinutes: number | null;
    averageFirstResponseTimeMinutes: number | null;
    totalMessagesToday: number;
    totalMessagesThisWeek: number;
    conversationsWithoutResponse: number;
    conversationsNeedingAttention: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  criticalConversations: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    clientId: string | null;
    clientName: string | null;
    score: number | null;
    temperature: string | null;
    alertsCount: number;
    interpretation: string | null;
    lastAnalysis: string | null;
    lastMessageAt: string | null;
    attendantId: string | null;
    attendantName: string | null;
  }>;
  recentCriticalAlerts: CriticalAlert[];
  recentCelebrationAlerts: CelebrationAlert[];
  attendantPerformance: AttendantPerformance[];
  hourlyMessageVolume: Array<{
    hour: number;
    inbound: number;
    outbound: number;
  }>;
  responseTimeBreakdown: {
    under5min: number;
    under15min: number;
    under30min: number;
    under1hour: number;
    over1hour: number;
  };
  pendingConversations: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    lastMessageAt: string;
    waitingMinutes: number;
    clientName: string | null;
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

  // Track dismissed alerts to avoid re-triggering - persist in localStorage
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cs-tv-dismissed-alerts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [dismissedCelebrationIds, setDismissedCelebrationIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cs-tv-dismissed-celebrations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [activeAlerts, setActiveAlerts] = useState<CriticalAlert[]>([]);
  const [activeCelebrations, setActiveCelebrations] = useState<CelebrationAlert[]>([]);

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

  // Check for new critical alerts (score < 3) - only show each alert once ever
  useEffect(() => {
    if (!data?.recentCriticalAlerts) return;

    const newAlerts = data.recentCriticalAlerts.filter(alert => {
      // Only show alerts that haven't been dismissed/shown before
      return !dismissedAlertIds.has(alert.id);
    });

    if (newAlerts.length > 0) {
      // Only add alerts that aren't already active
      setActiveAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const trulyNew = newAlerts.filter(a => !existingIds.has(a.id));
        return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
      });
    }
  }, [data?.recentCriticalAlerts, dismissedAlertIds]);

  // Check for new celebration alerts (score = 10) - only show each alert once ever
  useEffect(() => {
    if (!data?.recentCelebrationAlerts) return;

    const newCelebrations = data.recentCelebrationAlerts.filter(alert => {
      return !dismissedCelebrationIds.has(alert.id);
    });

    if (newCelebrations.length > 0) {
      setActiveCelebrations(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const trulyNew = newCelebrations.filter(a => !existingIds.has(a.id));
        return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
      });
    }
  }, [data?.recentCelebrationAlerts, dismissedCelebrationIds]);

  // Persist dismissed alerts to localStorage
  useEffect(() => {
    if (dismissedAlertIds.size > 0) {
      localStorage.setItem('cs-tv-dismissed-alerts', JSON.stringify([...dismissedAlertIds]));
    }
  }, [dismissedAlertIds]);

  // Persist dismissed celebrations to localStorage
  useEffect(() => {
    if (dismissedCelebrationIds.size > 0) {
      localStorage.setItem('cs-tv-dismissed-celebrations', JSON.stringify([...dismissedCelebrationIds]));
    }
  }, [dismissedCelebrationIds]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    setDismissedAlertIds(prev => new Set(prev).add(alertId));
  }, []);

  const handleDismissAllAlerts = useCallback(() => {
    const allIds = activeAlerts.map(a => a.id);
    setActiveAlerts([]);
    setDismissedAlertIds(prev => {
      const newSet = new Set(prev);
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [activeAlerts]);

  const handleDismissCelebration = useCallback((alertId: string) => {
    setActiveCelebrations(prev => prev.filter(a => a.id !== alertId));
    setDismissedCelebrationIds(prev => new Set(prev).add(alertId));
  }, []);

  const handleDismissAllCelebrations = useCallback(() => {
    const allIds = activeCelebrations.map(a => a.id);
    setActiveCelebrations([]);
    setDismissedCelebrationIds(prev => {
      const newSet = new Set(prev);
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [activeCelebrations]);

  useEffect(() => {
    if (data?.companyName) {
      document.title = `CS TV - ${data.companyName}`;
    }
  }, [data?.companyName]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground" />
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
          <p className="text-muted-foreground">Carregando CS Dashboard WhatsApp...</p>
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
    <>
      {/* Critical Alert Overlay - show first (priority) */}
      <CSTVCriticalAlertOverlay 
        alerts={activeAlerts}
        onDismiss={handleDismissAlert}
        onDismissAll={handleDismissAllAlerts}
        rotation={rotation}
      />

      {/* Celebration Overlay - show when no critical alerts */}
      {activeAlerts.length === 0 && (
        <CSTVCelebrationOverlay 
          alerts={activeCelebrations}
          onDismiss={handleDismissCelebration}
          onDismissAll={handleDismissAllCelebrations}
          rotation={rotation}
        />
      )}
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

          {/* Main WhatsApp Metrics */}
          <CSTVWhatsAppMetrics metrics={data.whatsappMetrics} />

          {/* Sentiment + Response Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CSTVSentimentBar sentiment={data.sentimentDistribution} />
            <CSTVResponseTimeBreakdown breakdown={data.responseTimeBreakdown} />
          </div>

          {/* Message Volume Chart */}
          <CSTVMessageVolume 
            hourlyVolume={data.hourlyMessageVolume}
            totalMessagesToday={data.whatsappMetrics.totalMessagesToday}
            totalMessagesThisWeek={data.whatsappMetrics.totalMessagesThisWeek}
          />

          {/* Attendant Performance + Pending Conversations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CSTVAttendantPerformance attendants={data.attendantPerformance} />
            <CSTVPendingConversations conversations={data.pendingConversations} />
          </div>

          {/* Critical Conversations */}
          <CSTVCriticalConversations 
            conversations={data.criticalConversations.map(c => ({
              id: c.id,
              contactName: c.contactName,
              contactPhone: c.contactPhone,
              clientId: c.clientId,
              clientName: c.clientName,
              score: c.score,
              temperature: c.temperature,
              alertsCount: c.alertsCount,
              lastAnalysis: c.lastAnalysis,
              attendantId: c.attendantId,
              attendantName: c.attendantName,
            }))} 
          />
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
    </>
  );
}
