import { Radar, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RadarTVHeaderProps {
  companyName: string;
  lastSyncAt: string | null;
  metrics: {
    totalClients: number;
    clientsAtRisk: number;
    clientsWithOpportunities: number;
    criticalAlerts: number;
    warningAlerts: number;
  };
}

export function RadarTVHeader({ companyName, lastSyncAt, metrics }: RadarTVHeaderProps) {
  const formattedTime = lastSyncAt 
    ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: ptBR })
    : 'Nunca sincronizado';

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20">
            <Radar className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Radar de Oportunidades e Riscos
            </h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Summary badges */}
          <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-4 py-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <span className="text-2xl font-bold text-destructive">{metrics.clientsAtRisk}</span>
              <span className="text-sm text-muted-foreground ml-1">em risco</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-green-500/10 rounded-lg px-4 py-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <span className="text-2xl font-bold text-green-500">{metrics.clientsWithOpportunities}</span>
              <span className="text-sm text-muted-foreground ml-1">oportunidades</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Alert counts */}
      <div className="flex gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm">
            <span className="font-bold text-destructive">{metrics.criticalAlerts}</span>
            <span className="text-muted-foreground"> alertas críticos</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm">
            <span className="font-bold text-yellow-500">{metrics.warningAlerts}</span>
            <span className="text-muted-foreground"> alertas de atenção</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span className="text-sm text-muted-foreground">
            {metrics.totalClients} clientes monitorados
          </span>
        </div>
      </div>
    </div>
  );
}
