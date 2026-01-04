import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, Tv } from 'lucide-react';
import { SocialTVHeader } from '@/components/social-tv-dashboard/SocialTVHeader';
import { SocialTVChampionCreative } from '@/components/social-tv-dashboard/SocialTVChampionCreative';
import { SocialTVGestorRanking } from '@/components/social-tv-dashboard/SocialTVGestorRanking';
import { SocialTVSquadRanking } from '@/components/social-tv-dashboard/SocialTVSquadRanking';
import { SocialTVTickerBar } from '@/components/social-tv-dashboard/SocialTVTickerBar';
import { SocialTVMetricsBadges } from '@/components/social-tv-dashboard/SocialTVMetricsBadges';
import { SocialTVControls } from '@/components/social-tv-dashboard/SocialTVControls';

interface SocialTVDashboardData {
  company: { id: string; name: string };
  lastSync: string;
  championCreative: {
    id: string;
    type: 'image' | 'video';
    url: string;
    title: string;
    clientName: string;
    clientAvatar: string | null;
    gestorName: string;
    gestorAvatar: string | null;
    ctr: number;
    roas: number;
    spend: number;
    conversions: number;
    platform: 'Meta' | 'Google';
  } | null;
  gestorRanking: Array<{
    id: string;
    name: string;
    avatar: string | null;
    position: number;
    conversions: number;
    clientsCount: number;
    totalSpend: number;
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
  featuredCreatives: Array<{
    id: string;
    type: 'image' | 'video' | 'carousel';
    url: string;
    thumbnailUrl?: string;
    clientName: string;
    status: string;
    ctr: number;
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
      const { data, error } = await supabase.functions.invoke<SocialTVDashboardData>(
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-center p-8">
          <Tv className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Token não encontrado</h1>
          <p className="text-purple-200/60">Verifique o link de acesso ao dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-200/80">Carregando Feed da Vitória...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Erro ao carregar</h1>
          <p className="text-purple-200/60 mb-4">
            {error instanceof Error ? error.message : 'Token inválido ou expirado.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Calculate dimensions for rotation
  const isRotated = rotation === 90 || rotation === 270;
  const containerStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
    transformOrigin: 'center center',
    width: isRotated ? '100vh' : '100vw',
    height: isRotated ? '100vw' : '100vh',
    position: 'fixed',
    top: isRotated ? `calc(50% - 50vw)` : 0,
    left: isRotated ? `calc(50% - 50vh)` : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 overflow-hidden">
      <div style={containerStyle} className="flex flex-col">
        {/* Header */}
        <SocialTVHeader companyName={data.company.name} />

        {/* Main Content - Vertical Layout */}
        <div className="flex-1 flex flex-col overflow-hidden relative pb-12">
          {/* Champion Creative - 50% */}
          <div className="flex-1 min-h-0" style={{ flex: '1 1 50%' }}>
            <SocialTVChampionCreative creative={data.championCreative} />
          </div>

          {/* Rankings - 35% - Side by side */}
          <div style={{ flex: '0 0 35%' }} className="flex gap-4 px-4">
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

      {/* Controls - Always visible, not affected by rotation */}
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
