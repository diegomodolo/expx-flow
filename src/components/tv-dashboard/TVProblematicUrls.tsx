import { AlertTriangle, Clock, ShieldAlert, FileX, Link2 } from "lucide-react";

type AlertStatus = 'error' | 'timeout' | 'suspicious' | 'empty';

interface ProblematicUrl {
  id: string;
  url: string;
  clientName: string;
  clientAvatar: string | null;
  status: AlertStatus;
  statusCode: number | null;
  activeCampaigns: number;
  contentMatchScore?: number | null;
}

interface TVProblematicUrlsProps {
  urls: ProblematicUrl[];
}

const getStatusConfig = (status: AlertStatus, statusCode: number | null, contentMatchScore?: number | null) => {
  switch (status) {
    case 'error':
      return {
        icon: AlertTriangle,
        label: statusCode ? `Erro ${statusCode}` : 'Erro',
        color: 'text-red-500'
      };
    case 'timeout':
      return {
        icon: Clock,
        label: 'Timeout',
        color: 'text-orange-500'
      };
    case 'suspicious':
      return {
        icon: ShieldAlert,
        label: contentMatchScore !== null && contentMatchScore !== undefined 
          ? `Suspeita ${Math.round(contentMatchScore)}%` 
          : 'Suspeita',
        color: 'text-yellow-500'
      };
    case 'empty':
      return {
        icon: FileX,
        label: 'Vazia',
        color: 'text-purple-500'
      };
    default:
      return {
        icon: AlertTriangle,
        label: 'Alerta',
        color: 'text-orange-500'
      };
  }
};

export function TVProblematicUrls({ urls }: TVProblematicUrlsProps) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Link2 className="h-4 w-4 text-red-500" />
          <span className="text-xs font-semibold text-red-500">
            URLs em Alerta ({urls.length})
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {urls.map((url) => {
            const config = getStatusConfig(url.status, url.statusCode, url.contentMatchScore);
            const StatusIcon = config.icon;
            
            return (
              <div 
                key={url.id}
                className="flex items-center gap-1.5 bg-background/60 rounded px-2 py-1 border border-red-500/20 shrink-0"
              >
                <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center text-[9px] font-medium text-red-600 shrink-0">
                  {url.clientName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium leading-tight truncate max-w-[100px]">
                    {url.clientName}
                  </span>
                  <span className={`text-[9px] ${config.color} flex items-center gap-0.5`}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {config.label}
                    <span className="text-muted-foreground mx-0.5">•</span>
                    <span>{url.activeCampaigns} camp.</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
