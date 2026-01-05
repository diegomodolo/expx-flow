import React from 'react';
import { Image, CheckCircle, TrendingUp, Target } from 'lucide-react';

interface Metrics {
  totalCreatives: number;
  creativesActive: number;
  avgEngagement: number;
  totalConversions: number;
}

interface SocialTVMetricsBadgesProps {
  metrics: Metrics;
}

export function SocialTVMetricsBadges({ metrics }: SocialTVMetricsBadgesProps) {
  const badges = [
    {
      icon: Image,
      value: metrics.totalCreatives,
      label: 'Criativos',
    },
    {
      icon: CheckCircle,
      value: metrics.creativesActive,
      label: 'Ativos',
    },
    {
      icon: TrendingUp,
      value: `${metrics.avgEngagement.toFixed(2)}%`,
      label: 'CTR Médio',
    },
    {
      icon: Target,
      value: metrics.totalConversions,
      label: 'Conversões',
    }
  ];

  return (
    <div className="p-4 bg-muted/50">
      <div className="grid grid-cols-4 gap-3">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-3 text-center"
          >
            <badge.icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{badge.value}</p>
            <p className="text-xs text-muted-foreground">{badge.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
