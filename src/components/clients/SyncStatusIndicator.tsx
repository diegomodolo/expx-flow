import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SyncStatusIndicatorProps {
  lastSyncAt?: string;
  lastSyncPeriod?: string;
}

export const SyncStatusIndicator = ({ lastSyncAt, lastSyncPeriod }: SyncStatusIndicatorProps) => {
  if (!lastSyncAt) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Nenhuma sincronização realizada</span>
      </div>
    );
  }

  const syncDate = new Date(lastSyncAt);
  const timeAgo = formatDistanceToNow(syncDate, { addSuffix: true, locale: ptBR });
  const daysDiff = Math.floor((Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
  const isOutdated = daysDiff > 1;

  const getPeriodLabel = (period?: string) => {
    switch (period) {
      case '7': return '7 dias';
      case '15': return '15 dias';
      case '30': return '30 dias';
      case '90': return '90 dias';
      case 'lifetime': return 'Máximo';
      default: return period || 'Desconhecido';
    }
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center space-x-2">
        {isOutdated ? (
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
        ) : (
          <RefreshCw className="w-4 h-4 text-green-600" />
        )}
        <div className="flex flex-col">
          <span className={isOutdated ? 'text-yellow-700' : 'text-green-700'}>
            Sincronizado {timeAgo}
          </span>
          {lastSyncPeriod && (
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-muted-foreground">Período:</span>
              <Badge variant="outline" className="text-xs">
                {getPeriodLabel(lastSyncPeriod)}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {isOutdated && (
        <Badge variant="destructive" className="text-xs">
          Dados desatualizados
        </Badge>
      )}
    </div>
  );
};