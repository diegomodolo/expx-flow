import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, AlertTriangle, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthMetrics {
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
}

interface CSTVHealthMetricsProps {
  metrics: HealthMetrics;
}

export function CSTVHealthMetrics({ metrics }: CSTVHealthMetricsProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    if (score >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  const getNPSIcon = () => {
    if (!metrics.averageNPS) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (metrics.averageNPS >= 9) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (metrics.averageNPS >= 7) return <Minus className="w-4 h-4 text-amber-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Health Score */}
      <Card className={cn("border-0 shadow-lg", getHealthBgColor(metrics.averageHealthScore))}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heart className={cn("w-6 h-6", getHealthColor(metrics.averageHealthScore))} />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Saúde Média
            </span>
          </div>
          <p className={cn("text-4xl font-bold", getHealthColor(metrics.averageHealthScore))}>
            {metrics.averageHealthScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {metrics.totalClients} clientes monitorados
          </p>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Risco
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-500 font-medium">Crítico</span>
              <span className="text-lg font-bold text-red-500">{metrics.criticalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-500 font-medium">Alto</span>
              <span className="text-lg font-bold text-orange-500">{metrics.highRiskClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500 font-medium">Médio</span>
              <span className="text-lg font-bold text-amber-500">{metrics.mediumRiskClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500 font-medium">Baixo</span>
              <span className="text-lg font-bold text-emerald-500">{metrics.lowRiskClients}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NPS Score */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {getNPSIcon()}
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              NPS Médio
            </span>
          </div>
          <p className="text-4xl font-bold text-foreground">
            {metrics.averageNPS !== null ? metrics.averageNPS.toFixed(1) : '-'}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-emerald-500">
              👍 {metrics.npsPromoters}
            </span>
            <span className="text-xs text-amber-500">
              😐 {metrics.npsPassives}
            </span>
            <span className="text-xs text-red-500">
              👎 {metrics.npsDetractors}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Clients */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-6 h-6 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Total
            </span>
          </div>
          <p className="text-4xl font-bold text-foreground">
            {metrics.totalClients}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            clientes no CS
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
