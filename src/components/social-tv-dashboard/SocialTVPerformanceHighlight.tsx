import React, { useState, useEffect } from 'react';
import { Target, DollarSign, TrendingUp, Star, Crown, Trophy, MousePointer } from 'lucide-react';

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
  status: 'excelente' | 'atencao' | 'emergencial' | 'inativo' | 'sem_fundos' | string;
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

interface SocialTVPerformanceHighlightProps {
  performanceMetrics: PerformanceMetrics;
  featuredClient: FeaturedClient | null;
  featuredClients?: FeaturedClient[];
  rotationInterval?: number;
  totalClicks?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$${(value / 1000).toFixed(1)}k`;
  }
  return `R$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'excelente':
      return 'bg-green-500';
    case 'atencao':
      return 'bg-yellow-500';
    case 'emergencial':
      return 'bg-red-500';
    case 'inativo':
    case 'sem_fundos':
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'excelente':
      return 'Excelente';
    case 'atencao':
      return 'Atenção';
    case 'emergencial':
      return 'Emergencial';
    case 'inativo':
      return 'Inativo';
    case 'sem_fundos':
      return 'Sem Fundos';
    default:
      return 'Ativo';
  }
}

function getHighlightIcon(iconName?: string) {
  switch (iconName) {
    case 'trophy':
      return <Trophy className="w-4 h-4 text-white" />;
    case 'trending-up':
      return <TrendingUp className="w-4 h-4 text-white" />;
    case 'target':
      return <Target className="w-4 h-4 text-white" />;
    case 'dollar-sign':
      return <DollarSign className="w-4 h-4 text-white" />;
    case 'mouse-pointer':
      return <MousePointer className="w-4 h-4 text-white" />;
    default:
      return <Crown className="w-4 h-4 text-white" />;
  }
}

function getHighlightBgColor(metric?: string): string {
  switch (metric) {
    case 'conversions':
      return 'bg-gradient-to-r from-yellow-500 to-amber-600';
    case 'ctr':
      return 'bg-gradient-to-r from-green-500 to-emerald-600';
    case 'cpa':
      return 'bg-gradient-to-r from-purple-500 to-violet-600';
    case 'spend':
      return 'bg-gradient-to-r from-blue-500 to-indigo-600';
    case 'clicks':
      return 'bg-gradient-to-r from-orange-500 to-red-500';
    default:
      return 'bg-yellow-500';
  }
}

export function SocialTVPerformanceHighlight({ 
  performanceMetrics, 
  featuredClient,
  featuredClients = [],
  rotationInterval = 8000,
  totalClicks = 0,
}: SocialTVPerformanceHighlightProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Usar featuredClients se disponível, senão usar featuredClient único
  const clientsToRotate = featuredClients.length > 0 
    ? featuredClients 
    : (featuredClient ? [featuredClient] : []);

  // Rotação automática
  useEffect(() => {
    if (clientsToRotate.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % clientsToRotate.length);
        setIsTransitioning(false);
      }, 300);
    }, rotationInterval);
    
    return () => clearInterval(interval);
  }, [clientsToRotate.length, rotationInterval]);

  const currentClient = clientsToRotate[currentIndex] || null;

  const metrics = [
    {
      icon: Target,
      label: 'Conversões',
      value: formatNumber(performanceMetrics.totalLeads),
    },
    {
      icon: DollarSign,
      label: 'Investimento',
      value: formatCurrency(performanceMetrics.totalSpend),
    },
    {
      icon: TrendingUp,
      label: 'CTR Médio',
      value: `${performanceMetrics.avgCtr.toFixed(2)}%`,
    },
    {
      icon: MousePointer,
      label: 'Cliques',
      value: formatNumber(totalClicks),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-4 py-2">
      {/* Performance Metrics Section */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Performance em Tempo Real
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl bg-card border border-border p-4"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Client Section */}
      <div className="flex-1 min-h-0 mb-8">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Cliente Destaque
          {clientsToRotate.length > 1 && (
            <span className="text-xs text-muted-foreground font-normal ml-2">
              ({currentIndex + 1} de {clientsToRotate.length})
            </span>
          )}
        </h2>
        
        {currentClient ? (
          <div 
            className={`relative overflow-hidden rounded-xl bg-card border border-border h-full min-h-[280px] transition-all duration-300 ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            {/* Background gradient based on team color */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{ 
                background: currentClient.teamColor 
                  ? `linear-gradient(135deg, ${currentClient.teamColor}40, transparent)`
                  : 'linear-gradient(135deg, hsl(var(--primary) / 0.4), transparent)'
              }}
            />
            
            {/* Badge Dinâmico - Motivo do Destaque */}
            <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg ${getHighlightBgColor(currentClient.highlightMetric)}`}>
              {getHighlightIcon(currentClient.highlightIcon)}
              <span className="text-sm font-bold text-white">
                {currentClient.highlightLabel || 'DESTAQUE'}
              </span>
            </div>

            {/* Valor em Destaque */}
            {currentClient.highlightValue && (
              <div className={`absolute top-4 left-4 px-4 py-2 rounded-xl shadow-lg ${getHighlightBgColor(currentClient.highlightMetric)}`}>
                <span className="text-2xl font-bold text-white">
                  {currentClient.highlightValue}
                </span>
              </div>
            )}

            <div className="relative z-10 flex flex-col justify-between h-full p-8 pt-20">
              {/* Client Info - Larger and more prominent */}
              <div className="flex items-center gap-8 mb-8">
                {/* Avatar - Bigger */}
                <div 
                  className="w-32 h-32 rounded-2xl flex items-center justify-center text-5xl font-bold text-white shadow-xl flex-shrink-0"
                  style={{ 
                    backgroundColor: currentClient.teamColor || 'hsl(var(--primary))',
                    border: '4px solid hsl(var(--border))'
                  }}
                >
                  {currentClient.avatar ? (
                    <img 
                      src={currentClient.avatar} 
                      alt={currentClient.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    currentClient.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name and Gestor - More prominent */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-4xl font-bold text-foreground truncate mb-3">
                    {currentClient.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-3">
                    {currentClient.gestorAvatar ? (
                      <img 
                        src={currentClient.gestorAvatar} 
                        alt={currentClient.gestorName || 'Gestor'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-border">
                        <span className="text-sm font-bold text-primary-foreground">
                          {(currentClient.gestorName || 'G').charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-lg text-muted-foreground">
                      Gestor: <span className="font-semibold text-foreground">{currentClient.gestorName || 'Não atribuído'}</span>
                    </span>
                  </div>
                  {currentClient.teamName && (
                    <div className="flex items-center gap-3 mt-3">
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: currentClient.teamColor || 'hsl(var(--primary))' }}
                      />
                      <span className="text-lg text-muted-foreground">{currentClient.teamName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatNumber(currentClient.totalConversions || 0)}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Conversões</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{currentClient.avgCtr.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">CTR</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{currentClient.totalCampaigns || 0}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Campanhas</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <div className={`inline-block px-3 py-1 rounded-full ${getStatusColor(currentClient.status)}`}>
                    <p className="text-sm font-bold text-white">{getStatusLabel(currentClient.status)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Status</p>
                </div>
              </div>
            </div>

            {/* Indicadores de Rotação */}
            {clientsToRotate.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-1.5">
                {clientsToRotate.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex 
                        ? 'bg-primary scale-125' 
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border flex items-center justify-center py-16">
            <div className="text-center text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum cliente em destaque</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
