import React from 'react';
import { Trophy, Zap } from 'lucide-react';

interface SocialTVHeaderProps {
  companyName: string;
}

export function SocialTVHeader({ companyName }: SocialTVHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Feed da Vitória
          </h1>
          <p className="text-sm text-purple-200/80">{companyName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
        <span className="text-xs text-purple-200/70 uppercase tracking-wider font-medium">
          Ao Vivo
        </span>
      </div>
    </div>
  );
}
