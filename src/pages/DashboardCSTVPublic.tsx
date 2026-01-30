import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSTVHeader } from "@/components/cs-tv-dashboard/CSTVHeader";
import { CSTVWhatsAppMetrics } from "@/components/cs-tv-dashboard/CSTVWhatsAppMetrics";
import { CSTVSentimentBar } from "@/components/cs-tv-dashboard/CSTVSentimentBar";
import { CSTVCriticalConversations } from "@/components/cs-tv-dashboard/CSTVCriticalConversations";
import { CSTVRecentEvaluations } from "@/components/cs-tv-dashboard/CSTVRecentEvaluations";
import { CSTVPendingConversations } from "@/components/cs-tv-dashboard/CSTVPendingConversations";
import { CSTVAttendantPerformance } from "@/components/cs-tv-dashboard/CSTVAttendantPerformance";
import { CSTVMessageVolume } from "@/components/cs-tv-dashboard/CSTVMessageVolume";
import { CSTVSentimentVolume } from "@/components/cs-tv-dashboard/CSTVSentimentVolume";
import { CSTVResponseTimeBreakdown } from "@/components/cs-tv-dashboard/CSTVResponseTimeBreakdown";
import { CSTVControls } from "@/components/cs-tv-dashboard/CSTVControls";
import { CSTVCriticalAlertOverlay, CriticalAlert } from "@/components/cs-tv-dashboard/CSTVCriticalAlertOverlay";
import { CSTVCelebrationOverlay, CelebrationAlert } from "@/components/cs-tv-dashboard/CSTVCelebrationOverlay";
import { supabasePublic } from "@/integrations/supabase/publicClient";
import { useCSTVRealtimeAlerts, useMarkAlertAsDisplayed } from "@/hooks/useCSTVRealtimeAlerts";

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
  recentEvaluations: Array<{
    id: string;
    conversationId: string;
    contactName: string;
    contactPhone: string;
    clientName: string | null;
    attendantId: string | null;
    attendantName: string | null;
    score: number | null;
    temperature: string;
    interpretation: string | null;
    analyzedAt: string;
  }>;
  attendantPerformance: AttendantPerformance[];
  hourlyMessageVolume: Array<{
    hour: number;
    inbound: number;
    outbound: number;
  }>;
  hourlySentimentVolume: Array<{
    hour: number;
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number | null;
    totalAnalyses: number;
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

  // Track company ID for realtime subscription
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Active alerts state (no localStorage, uses database persistence via useCSTVRealtimeAlerts)
  const [activeAlerts, setActiveAlerts] = useState<CriticalAlert[]>([]);
  const [activeCelebrations, setActiveCelebrations] = useState<CelebrationAlert[]>([]);
  
  // Track IDs of alerts currently being displayed (to avoid duplicates from periodic fetch)
  const displayedAlertIdsRef = useRef<Set<string>>(new Set());
  const displayedCelebrationIdsRef = useRef<Set<string>>(new Set());
  
  // Helper hook to mark alerts as displayed in the database
  const { markAsDisplayed } = useMarkAlertAsDisplayed();

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

  // Extract company ID from the first successful data fetch
  useEffect(() => {
    // We need to get the company ID to subscribe to realtime alerts
    // The edge function validates the token and returns data for a specific company
    // We can fetch the company ID by making a quick validation call
    if (!token || companyId) return;
    
    const fetchCompanyId = async () => {
      try {
        const { data: companyData } = await supabasePublic
          .from("companies")
          .select("id")
          .eq("cs_tv_dashboard_token", token)
          .single();
        
        if (companyData?.id) {
          console.log("[DashboardCSTVPublic] Company ID fetched:", companyData.id);
          setCompanyId(companyData.id);
        }
      } catch (err) {
        console.error("[DashboardCSTVPublic] Error fetching company ID:", err);
      }
    };
    
    fetchCompanyId();
  }, [token, companyId]);

  // Subscribe to realtime alerts
  const { isConnected: realtimeConnected } = useCSTVRealtimeAlerts({
    token: token || "",
    companyId,
    onNewCriticalAlert: useCallback((alert: CriticalAlert) => {
      console.log("[DashboardCSTVPublic] New critical alert from realtime:", alert.id);
      setActiveAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === alert.id)) return prev;
        return [...prev, alert];
      });
    }, []),
    onNewCelebrationAlert: useCallback((alert: CelebrationAlert) => {
      console.log("[DashboardCSTVPublic] New celebration alert from realtime:", alert.id);
      setActiveCelebrations(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === alert.id)) return prev;
        return [...prev, alert];
      });
    }, []),
  });

  // Fallback: Check for new alerts from periodic fetch (in case realtime missed something)
  // The edge function already filters out displayed alerts, so we just add any new ones
  useEffect(() => {
    if (!data?.recentCriticalAlerts || !companyId) return;

    const newAlerts = data.recentCriticalAlerts.filter(alert => {
      // Skip if already displayed in this session
      if (displayedAlertIdsRef.current.has(alert.id)) return false;
      // Skip if already active
      if (activeAlerts.some(a => a.id === alert.id)) return false;
      return true;
    });

    if (newAlerts.length > 0) {
      console.log("[DashboardCSTVPublic] New critical alerts from fetch:", newAlerts.length);
      
      // Mark them as displayed in the database and add to active
      newAlerts.forEach(async (alert) => {
        displayedAlertIdsRef.current.add(alert.id);
        await markAsDisplayed(companyId, alert.id, "critical", {
          score: alert.score,
          conversationId: alert.conversationId,
          contactName: alert.contactName,
          attendantName: alert.attendantName || undefined,
        });
      });
      
      setActiveAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const trulyNew = newAlerts.filter(a => !existingIds.has(a.id));
        return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
      });
    }
  }, [data?.recentCriticalAlerts, companyId, activeAlerts, markAsDisplayed]);

  // Fallback for celebration alerts
  useEffect(() => {
    if (!data?.recentCelebrationAlerts || !companyId) return;

    const newCelebrations = data.recentCelebrationAlerts.filter(alert => {
      if (displayedCelebrationIdsRef.current.has(alert.id)) return false;
      if (activeCelebrations.some(a => a.id === alert.id)) return false;
      return true;
    });

    if (newCelebrations.length > 0) {
      console.log("[DashboardCSTVPublic] New celebration alerts from fetch:", newCelebrations.length);
      
      newCelebrations.forEach(async (alert) => {
        displayedCelebrationIdsRef.current.add(alert.id);
        await markAsDisplayed(companyId, alert.id, "celebration", {
          score: alert.score,
          conversationId: alert.conversationId,
          contactName: alert.contactName,
          attendantName: alert.attendantName || undefined,
        });
      });
      
      setActiveCelebrations(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const trulyNew = newCelebrations.filter(a => !existingIds.has(a.id));
        return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
      });
    }
  }, [data?.recentCelebrationAlerts, companyId, activeCelebrations, markAsDisplayed]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    displayedAlertIdsRef.current.add(alertId);
  }, []);

  const handleDismissAllAlerts = useCallback(() => {
    activeAlerts.forEach(a => displayedAlertIdsRef.current.add(a.id));
    setActiveAlerts([]);
  }, [activeAlerts]);

  const handleDismissCelebration = useCallback((alertId: string) => {
    setActiveCelebrations(prev => prev.filter(a => a.id !== alertId));
    displayedCelebrationIdsRef.current.add(alertId);
  }, []);

  const handleDismissAllCelebrations = useCallback(() => {
    activeCelebrations.forEach(a => displayedCelebrationIdsRef.current.add(a.id));
    setActiveCelebrations([]);
  }, [activeCelebrations]);

  // Test modal handlers - use real alerts from data
  const handleTestCriticalAlert = useCallback(() => {
    // Try to get a real critical alert from the data, fallback to a test one
    if (data?.recentCriticalAlerts && data.recentCriticalAlerts.length > 0) {
      const realAlert = data.recentCriticalAlerts[0];
      // Create a copy with a test ID so it doesn't get marked as dismissed
      const testAlert: CriticalAlert = {
        ...realAlert,
        id: `test-${realAlert.id}-${Date.now()}`,
      };
      setActiveAlerts(prev => [...prev, testAlert]);
    } else {
      // Fallback to fake alert if no real alerts exist
      const testAlert: CriticalAlert = {
        id: `test-critical-${Date.now()}`,
        conversationId: 'test-conversation',
        contactName: 'Cliente Teste',
        contactPhone: '(11) 99999-9999',
        clientName: 'Empresa Teste Ltda',
        score: 2,
        temperature: 'critical',
        interpretation: 'Este é um alerta de teste. Não há alertas críticos recentes no sistema.',
        suggestion: 'Nenhum alerta real disponível para teste.',
        attendantId: null,
        attendantName: null,
        analyzedAt: new Date().toISOString(),
      };
      setActiveAlerts(prev => [...prev, testAlert]);
    }
  }, [data?.recentCriticalAlerts]);

  const handleTestCelebrationAlert = useCallback(() => {
    // Try to get a real celebration alert from the data, fallback to a test one
    if (data?.recentCelebrationAlerts && data.recentCelebrationAlerts.length > 0) {
      const realAlert = data.recentCelebrationAlerts[0];
      // Create a copy with a test ID so it doesn't get marked as dismissed
      const testCelebration: CelebrationAlert = {
        ...realAlert,
        id: `test-${realAlert.id}-${Date.now()}`,
      };
      setActiveCelebrations(prev => [...prev, testCelebration]);
    } else {
      // Fallback to fake alert if no real celebrations exist
      const testCelebration: CelebrationAlert = {
        id: `test-celebration-${Date.now()}`,
        conversationId: 'test-conversation',
        contactName: 'Cliente Satisfeito',
        contactPhone: '(11) 88888-8888',
        clientName: 'Empresa Feliz S.A.',
        squadName: null,
        score: 10,
        temperature: 'positive',
        interpretation: 'Este é um alerta de teste. Não há celebrações recentes no sistema.',
        lastClientMessage: 'Nenhuma celebração real disponível para teste.',
        attendantId: null,
        attendantName: null,
        analyzedAt: new Date().toISOString(),
      };
      setActiveCelebrations(prev => [...prev, testCelebration]);
    }
  }, [data?.recentCelebrationAlerts]);

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
        zoom={zoom}
      />

      {/* Celebration Overlay - show when no critical alerts */}
      {activeAlerts.length === 0 && (
        <CSTVCelebrationOverlay 
          alerts={activeCelebrations}
          onDismiss={handleDismissCelebration}
          onDismissAll={handleDismissAllCelebrations}
          rotation={rotation}
          zoom={zoom}
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

          {/* Sentiment Volume Chart */}
          <CSTVSentimentVolume hourlySentiment={data.hourlySentimentVolume} />

          {/* Attendant Performance + Pending Conversations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CSTVAttendantPerformance attendants={data.attendantPerformance} />
            <CSTVPendingConversations conversations={data.pendingConversations} />
          </div>

          {/* Critical Conversations + Recent Evaluations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <CSTVRecentEvaluations evaluations={data.recentEvaluations} />
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
          onTestCriticalAlert={handleTestCriticalAlert}
          onTestCelebrationAlert={handleTestCelebrationAlert}
        />
      </div>
    </>
  );
}
