import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Loader2, AlertTriangle, Tv } from 'lucide-react';
import { SocialTVHeader } from '@/components/social-tv-dashboard/SocialTVHeader';
import { SocialTVPerformanceHighlight } from '@/components/social-tv-dashboard/SocialTVPerformanceHighlight';
import { SocialTVGestorRanking } from '@/components/social-tv-dashboard/SocialTVGestorRanking';
import { SocialTVSquadRanking } from '@/components/social-tv-dashboard/SocialTVSquadRanking';
import { SocialTVTickerBar } from '@/components/social-tv-dashboard/SocialTVTickerBar';
import { SocialTVMetricsBadges } from '@/components/social-tv-dashboard/SocialTVMetricsBadges';
import { SocialTVControls } from '@/components/social-tv-dashboard/SocialTVControls';

interface PerformanceMetrics {
  totalLeads: number;
  totalSpend: number;
  avgCtr: number;
  activeClients: number;
  totalAds: number;
}

interface FeaturedClient {
  id: string;
  name: string;
  avatar: string | null;
  gestorName: string | null;
  gestorAvatar: string | null;
  teamName: string | null;
  teamColor: string | null;
  status: string;
  totalSpend: number;
  avgCtr: number;
  totalAds: number;
  totalConversions?: number;
  totalCampaigns?: number;
  // Campos para destaque rotativo
  highlightMetric?: string;
  highlightLabel?: string;
  highlightValue?: string;
  highlightIcon?: string;
}

interface SocialTVDashboardData {
  company: { id: string; name: string };
  lastSync: string;
  performanceMetrics: PerformanceMetrics;
  featuredClient: FeaturedClient | null;
  featuredClients?: FeaturedClient[]; // Array para rotação
  gestorRanking: Array<{
    id: string;
    name: string;
    avatar: string | null;
    position: number;
    conversions: number;
    clientsCount: number;
    totalSpend: number;
    clients?: Array<{
      id: string;
      name: string;
      avatar: string | null;
      conversions: number;
      spend: number;
    }>;
  }>;
  squadRanking: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    position: number;
    conversions: number;
    clientsCount: number;
    totalSpend: number;
  }>;
  recentWins: Array<{
    id: string;
    type: 'sale' | 'lead';
    value: number;
    clientName: string;
    gestorName: string;
    gestorAvatar: string | null;
    timestamp: string;
  }>;
  metrics: {
    totalCreatives: number;
    creativesActive: number;
    avgEngagement: number;
    totalConversions: number;
  };
}

export default function DashboardSocialTVPublic() {
  const { token } = useParams<{ token: string }>();
  const [refreshInterval, setRefreshInterval] = useState(5 * 60 * 1000); // 5 minutes
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('social-tv-zoom');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(() => {
    const saved = localStorage.getItem('social-tv-rotation');
    return saved ? (parseInt(saved, 10) as 0 | 90 | 180 | 270) : 0;
  });

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    localStorage.setItem('social-tv-zoom', newZoom.toString());
  };

  const handleRotationChange = (newRotation: 0 | 90 | 180 | 270) => {
    setRotation(newRotation);
    localStorage.setItem('social-tv-rotation', newRotation.toString());
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['social-tv-dashboard', token],
    queryFn: async () => {
      const { data, error } = await supabasePublic.functions.invoke<SocialTVDashboardData>(
        'social-tv-dashboard-data',
        { body: { token } }
      );
      
      if (error) throw error;
      return data;
    },
    enabled: !!token,
    refetchInterval: refreshInterval,
    staleTime: 60000,
  });

  // Update document title
  useEffect(() => {
    if (data?.company?.name) {
      document.title = `Feed da Vitória - ${data.company.name}`;
    }
  }, [data?.company?.name]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <Tv className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Token não encontrado</h1>
          <p className="text-muted-foreground">Verifique o link de acesso ao dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando Feed da Vitória...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro ao carregar</h1>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Token inválido ou expirado.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Default values if data is missing
  const performanceMetrics = data.performanceMetrics || {
    totalLeads: 0,
    totalSpend: 0,
    avgCtr: 0,
    activeClients: 0,
    totalAds: 0
  };

  const getRotationStyles = () => {
    const baseScale = zoom / 100;
    const isVertical = rotation === 90 || rotation === 270;
    
    if (isVertical) {
      return {
        transform: `rotate(${rotation}deg) scale(${baseScale})`,
        transformOrigin: 'center center',
        width: '100vh',
        height: '100vw',
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        marginTop: '-50vw',
        marginLeft: '-50vh',
      };
    }
    
    return {
      transform: `rotate(${rotation}deg) scale(${baseScale})`,
      transformOrigin: 'top left',
      width: `${10000 / zoom}%`,
      height: `${10000 / zoom}%`,
    };
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Zoomable and rotatable container */}
      <div 
        className="h-full flex flex-col"
        style={getRotationStyles()}
      >
        {/* Header */}
        <SocialTVHeader companyName={data.company.name} />

        {/* Main Content - Vertical Layout */}
        <div className="flex-1 flex flex-col overflow-hidden relative pb-12">
          {/* Performance Highlight - 50% */}
          <div className="flex-1 min-h-0 px-4" style={{ flex: '1 1 50%' }}>
            <SocialTVPerformanceHighlight 
              performanceMetrics={performanceMetrics}
              featuredClient={data.featuredClient}
              featuredClients={data.featuredClients}
              rotationInterval={8000}
            />
          </div>

          {/* Rankings - 35% - Side by side */}
          <div style={{ flex: '0 0 35%' }} className="flex gap-4 px-4 mt-6">
            <div className="flex-1 rounded-xl overflow-hidden">
              <SocialTVGestorRanking gestores={data.gestorRanking} />
            </div>
            <div className="flex-1 rounded-xl overflow-hidden">
              <SocialTVSquadRanking squads={data.squadRanking || []} />
            </div>
          </div>

          {/* Metrics - 15% */}
          <div style={{ flex: '0 0 auto' }}>
            <SocialTVMetricsBadges metrics={data.metrics} />
          </div>

          {/* Ticker Bar - Fixed at bottom */}
          <SocialTVTickerBar wins={data.recentWins} />
        </div>
      </div>

      {/* Controls - Always visible, not affected by zoom */}
      <SocialTVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
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
