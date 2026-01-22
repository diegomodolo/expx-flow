import { Link2, AlertTriangle, Clock } from "lucide-react";

interface ProblematicUrl {
  id: string;
  url: string;
  clientName: string;
  clientAvatar: string | null;
  status: 'error' | 'timeout';
  statusCode: number | null;
  activeCampaigns: number;
}

interface TVProblematicUrlsProps {
  urls: ProblematicUrl[];
}

export function TVProblematicUrls({ urls }: TVProblematicUrlsProps) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-md px-3 py-2">
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Link2 className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-orange-500">
            URLs com Erro ({urls.length})
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {urls.slice(0, 6).map((url) => (
            <div 
              key={url.id}
              className="flex items-center gap-1.5 bg-background/60 rounded px-2 py-1 border border-orange-500/20 shrink-0"
            >
              <div className="h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[9px] font-medium text-orange-600 shrink-0">
                {url.clientName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium leading-tight truncate max-w-[100px]">
                  {url.clientName}
                </span>
                <span className="text-[9px] text-orange-500 flex items-center gap-0.5">
                  {url.status === 'error' ? (
                    <>
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {url.statusCode || 'Erro'}
                    </>
                  ) : (
                    <>
                      <Clock className="h-2.5 w-2.5" />
                      Timeout
                    </>
                  )}
                  <span className="text-muted-foreground mx-0.5">•</span>
                  <span>{url.activeCampaigns} camp.</span>
                </span>
              </div>
            </div>
          ))}
          {urls.length > 6 && (
            <span className="text-[10px] text-orange-500 shrink-0">
              +{urls.length - 6} mais
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
