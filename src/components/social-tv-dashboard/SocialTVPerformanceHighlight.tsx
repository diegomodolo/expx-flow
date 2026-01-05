import React from 'react';
import { Target, DollarSign, TrendingUp, Users, Star, Crown } from 'lucide-react';

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
}

interface SocialTVPerformanceHighlightProps {
  performanceMetrics: PerformanceMetrics;
  featuredClient: FeaturedClient | null;
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

export function SocialTVPerformanceHighlight({ 
  performanceMetrics, 
  featuredClient 
}: SocialTVPerformanceHighlightProps) {
  const metrics = [
    {
      icon: Target,
      label: 'Conversões',
      value: formatNumber(performanceMetrics.totalLeads),
      color: 'from-pink-500 to-rose-600',
      iconBg: 'bg-pink-500/20',
    },
    {
      icon: DollarSign,
      label: 'Investimento',
      value: formatCurrency(performanceMetrics.totalSpend),
      color: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-500/20',
    },
    {
      icon: TrendingUp,
      label: 'CTR Médio',
      value: `${performanceMetrics.avgCtr.toFixed(2)}%`,
      color: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-500/20',
    },
    {
      icon: Users,
      label: 'Clientes Ativos',
      value: formatNumber(performanceMetrics.activeClients),
      color: 'from-purple-500 to-violet-600',
      iconBg: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="h-full flex flex-col gap-4 py-2">
      {/* Performance Metrics Section */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-bold text-white/90 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Performance em Tempo Real
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-10`} />
              <div className="relative z-10">
                <div className={`w-10 h-10 rounded-lg ${metric.iconBg} flex items-center justify-center mb-2`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{metric.value}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Client Section */}
      <div className="flex-1 min-h-0 mb-6">
        <h2 className="text-lg font-bold text-white/90 mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Cliente Destaque
        </h2>
        
        {featuredClient ? (
          <div className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            {/* Background gradient based on team color */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                background: featuredClient.teamColor 
                  ? `linear-gradient(135deg, ${featuredClient.teamColor}40, transparent)`
                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), transparent)'
              }}
            />
            
            {/* Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">DESTAQUE</span>
            </div>

            <div className="relative z-10 flex flex-col p-6">
              {/* Client Info - Larger and more prominent */}
              <div className="flex items-center gap-6 mb-6">
                {/* Avatar - Bigger */}
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-xl flex-shrink-0"
                  style={{ 
                    backgroundColor: featuredClient.teamColor || '#8B5CF6',
                    border: '4px solid rgba(255,255,255,0.25)'
                  }}
                >
                  {featuredClient.avatar ? (
                    <img 
                      src={featuredClient.avatar} 
                      alt={featuredClient.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    featuredClient.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name and Gestor - More prominent */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-bold text-white truncate mb-2">
                    {featuredClient.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    {featuredClient.gestorAvatar ? (
                      <img 
                        src={featuredClient.gestorAvatar} 
                        alt={featuredClient.gestorName || 'Gestor'}
                        className="w-7 h-7 rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center border-2 border-white/20">
                        <span className="text-xs font-bold text-white">
                          {(featuredClient.gestorName || 'G').charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-base text-white/80">
                      Gestor: <span className="font-semibold text-white">{featuredClient.gestorName || 'Não atribuído'}</span>
                    </span>
                  </div>
                  {featuredClient.teamName && (
                    <div className="flex items-center gap-3 mt-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: featuredClient.teamColor || '#8B5CF6' }}
                      />
                      <span className="text-base text-white/80">{featuredClient.teamName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-white">{formatCurrency(featuredClient.totalSpend)}</p>
                  <p className="text-xs text-white/50 uppercase mt-1">Investimento</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-white">{featuredClient.avgCtr.toFixed(2)}%</p>
                  <p className="text-xs text-white/50 uppercase mt-1">CTR</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-white">{featuredClient.totalAds}</p>
                  <p className="text-xs text-white/50 uppercase mt-1">Anúncios</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className={`inline-block px-3 py-1 rounded-full ${getStatusColor(featuredClient.status)}`}>
                    <p className="text-sm font-bold text-white">{getStatusLabel(featuredClient.status)}</p>
                  </div>
                  <p className="text-xs text-white/50 uppercase mt-1">Status</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center py-12">
            <div className="text-center text-white/40">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum cliente em destaque</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
