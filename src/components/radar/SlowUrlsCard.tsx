import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Gauge, ExternalLink } from "lucide-react";
import { RadarUrl } from "@/hooks/useRadarUrls";

interface SlowUrlsCardProps {
  urls: RadarUrl[];
}

export function SlowUrlsCard({ urls }: SlowUrlsCardProps) {
  // Sort by response time descending
  const sortedUrls = [...urls].sort((a, b) => 
    (b.validation_load_time_ms || 0) - (a.validation_load_time_ms || 0)
  );

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return '-';
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  const getSpeedColor = (ms: number | null) => {
    if (!ms) return 'text-muted-foreground';
    if (ms > 5000) return 'text-destructive';
    if (ms > 3000) return 'text-orange-600 dark:text-orange-500';
    return 'text-yellow-600 dark:text-yellow-500';
  };

  return (
    <Card className="border-yellow-500/30 flex flex-col h-full">
      <CardHeader className="pb-2 px-3 pt-3 shrink-0">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Gauge className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
          Lentas (&gt;3s)
          {urls.length > 0 && (
            <Badge variant="outline" className="ml-1 h-5 text-xs text-yellow-600 dark:text-yellow-500 border-yellow-600">
              {urls.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex-1 min-h-0">
        {urls.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-xs text-muted-foreground text-center">
              Nenhuma URL com tempo alto
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <div className="space-y-1.5 pr-2">
              {sortedUrls.slice(0, 10).map((url) => (
                <div 
                  key={url.id} 
                  className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs truncate max-w-[80px]">
                        {url.client_name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] h-4 px-1 shrink-0 ${getSpeedColor(url.validation_load_time_ms)}`}
                      >
                        {formatResponseTime(url.validation_load_time_ms)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {url.url}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    asChild
                  >
                    <a href={url.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </Button>
                </div>
              ))}
              {urls.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">
                  +{urls.length - 10} URLs
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
