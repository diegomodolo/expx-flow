import { Link2, AlertTriangle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProblematicUrl {
  id: string;
  url: string;
  clientName: string;
  clientAvatar: string | null;
  status: 'error' | 'timeout';
  statusCode: number | null;
  activeCampaigns: number;
}

interface RadarTVProblematicUrlsProps {
  urls: ProblematicUrl[];
}

export function RadarTVProblematicUrls({ urls }: RadarTVProblematicUrlsProps) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold text-orange-500">
          URLs com Problema ({urls.length})
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {urls.map((url) => (
          <div 
            key={url.id}
            className="flex items-center gap-2 bg-background/80 rounded-md px-3 py-2 border border-orange-500/20"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={url.clientAvatar || undefined} />
              <AvatarFallback className="bg-orange-500/20 text-orange-600 text-xs">
                {url.clientName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{url.clientName}</span>
              <span className="text-xs text-orange-500 flex items-center gap-1">
                {url.status === 'error' ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Erro {url.statusCode || ''}
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Timeout
                  </>
                )}
                <span className="text-muted-foreground">•</span>
                <span>{url.activeCampaigns} {url.activeCampaigns === 1 ? 'campanha' : 'campanhas'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
