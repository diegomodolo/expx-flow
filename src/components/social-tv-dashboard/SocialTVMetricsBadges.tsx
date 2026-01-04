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
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-200'
    },
    {
      icon: CheckCircle,
      value: metrics.creativesActive,
      label: 'Ativos',
      color: 'from-green-500 to-green-600',
      iconColor: 'text-green-200'
    },
    {
      icon: TrendingUp,
      value: `${metrics.avgEngagement.toFixed(2)}%`,
      label: 'CTR Médio',
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-200'
    },
    {
      icon: Target,
      value: metrics.totalConversions,
      label: 'Conversões',
      color: 'from-orange-500 to-orange-600',
      iconColor: 'text-orange-200'
    }
  ];

  return (
    <div className="p-4 bg-black/30">
      <div className="grid grid-cols-4 gap-3">
        {badges.map((badge, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${badge.color} rounded-xl p-3 text-center shadow-lg`}
          >
            <badge.icon className={`w-5 h-5 ${badge.iconColor} mx-auto mb-1`} />
            <p className="text-lg font-bold text-white">{badge.value}</p>
            <p className="text-xs text-white/70">{badge.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
