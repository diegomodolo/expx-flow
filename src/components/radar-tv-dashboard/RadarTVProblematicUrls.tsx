import { Link2, AlertTriangle, Clock, ShieldAlert, FileX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

interface RadarTVProblematicUrlsProps {
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

export function RadarTVProblematicUrls({ urls }: RadarTVProblematicUrlsProps) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold text-red-500">
          URLs em Alerta ({urls.length})
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {urls.map((url) => {
          const config = getStatusConfig(url.status, url.statusCode, url.contentMatchScore);
          const StatusIcon = config.icon;
          
          return (
            <div 
              key={url.id}
              className="flex items-center gap-2 bg-background/80 rounded-md px-3 py-2 border border-red-500/20"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={url.clientAvatar || undefined} />
                <AvatarFallback className="bg-red-500/20 text-red-600 text-xs">
                  {url.clientName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{url.clientName}</span>
                <span className={`text-xs ${config.color} flex items-center gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                  <span className="text-muted-foreground">•</span>
                  <span>{url.activeCampaigns} {url.activeCampaigns === 1 ? 'campanha' : 'campanhas'}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
