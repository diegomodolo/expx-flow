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
  totalConversions?: number;
  totalCampaigns?: number;
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
      icon: Users,
      label: 'Clientes Ativos',
      value: formatNumber(performanceMetrics.activeClients),
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
        </h2>
        
        {featuredClient ? (
          <div className="relative overflow-hidden rounded-xl bg-card border border-border h-full min-h-[280px]">
            {/* Background gradient based on team color */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{ 
                background: featuredClient.teamColor 
                  ? `linear-gradient(135deg, ${featuredClient.teamColor}40, transparent)`
                  : 'linear-gradient(135deg, hsl(var(--primary) / 0.4), transparent)'
              }}
            />
            
            {/* Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 rounded-full">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">DESTAQUE</span>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full p-8">
              {/* Client Info - Larger and more prominent */}
              <div className="flex items-center gap-8 mb-8">
                {/* Avatar - Bigger */}
                <div 
                  className="w-32 h-32 rounded-2xl flex items-center justify-center text-5xl font-bold text-white shadow-xl flex-shrink-0"
                  style={{ 
                    backgroundColor: featuredClient.teamColor || 'hsl(var(--primary))',
                    border: '4px solid hsl(var(--border))'
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
                  <h3 className="text-4xl font-bold text-foreground truncate mb-3">
                    {featuredClient.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-3">
                    {featuredClient.gestorAvatar ? (
                      <img 
                        src={featuredClient.gestorAvatar} 
                        alt={featuredClient.gestorName || 'Gestor'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-border">
                        <span className="text-sm font-bold text-primary-foreground">
                          {(featuredClient.gestorName || 'G').charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-lg text-muted-foreground">
                      Gestor: <span className="font-semibold text-foreground">{featuredClient.gestorName || 'Não atribuído'}</span>
                    </span>
                  </div>
                  {featuredClient.teamName && (
                    <div className="flex items-center gap-3 mt-3">
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: featuredClient.teamColor || 'hsl(var(--primary))' }}
                      />
                      <span className="text-lg text-muted-foreground">{featuredClient.teamName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatNumber(featuredClient.totalConversions || 0)}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Conversões</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{featuredClient.avgCtr.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">CTR</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{featuredClient.totalCampaigns || 0}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Campanhas</p>
                </div>
                <div className="bg-muted rounded-xl p-5 text-center">
                  <div className={`inline-block px-3 py-1 rounded-full ${getStatusColor(featuredClient.status)}`}>
                    <p className="text-sm font-bold text-white">{getStatusLabel(featuredClient.status)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Status</p>
                </div>
              </div>
            </div>
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
