import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

interface RecentWin {
  id: string;
  type: 'sale' | 'lead';
  value: number;
  clientName: string;
  gestorName: string;
  gestorAvatar: string | null;
  timestamp: string;
}

interface SocialTVTickerBarProps {
  wins: RecentWin[];
}

export function SocialTVTickerBar({ wins }: SocialTVTickerBarProps) {
  if (wins.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) {
      return `há ${diffMins}min`;
    } else if (diffHours < 24) {
      return `há ${diffHours}h`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  };

  // Duplicate wins for seamless scrolling
  const duplicatedWins = [...wins, ...wins];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-green-900/95 via-emerald-900/95 to-green-900/95 backdrop-blur-sm border-t border-green-500/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-1 flex-shrink-0 pr-4 border-r border-green-500/30">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-xs font-bold text-green-200 uppercase tracking-wider">
            Últimas Vitórias
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker gap-8">
            {duplicatedWins.map((win, index) => (
              <div
                key={`${win.id}-${index}`}
                className="flex items-center gap-3 flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-white">
                    {win.value} {win.type === 'lead' ? 'leads' : 'vendas'}
                  </span>
                </div>
                <span className="text-sm text-green-200/80">
                  {win.clientName}
                </span>
                <span className="text-xs text-green-300/50">•</span>
                <span className="text-sm text-green-200/60">
                  {win.gestorName}
                </span>
                <span className="text-xs text-green-300/40">
                  {formatTimestamp(win.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
