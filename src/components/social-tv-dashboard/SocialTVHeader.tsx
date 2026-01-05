import React from 'react';
import { Trophy, Zap } from 'lucide-react';

interface SocialTVHeaderProps {
  companyName: string;
}

export function SocialTVHeader({ companyName }: SocialTVHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <Trophy className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Feed da Vitória
          </h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Ao Vivo
        </span>
      </div>
    </div>
  );
}
