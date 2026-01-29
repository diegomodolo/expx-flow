import React from 'react';
import { Heart, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CSTVHeaderProps {
  companyName: string;
  lastUpdatedAt: string | null;
}

export function CSTVHeader({ companyName, lastUpdatedAt }: CSTVHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            CS Dashboard TV
          </h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {lastUpdatedAt && (
          <span className="text-xs text-muted-foreground">
            Atualizado: {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-pink-500 animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Ao Vivo
          </span>
        </div>
      </div>
    </div>
  );
}
