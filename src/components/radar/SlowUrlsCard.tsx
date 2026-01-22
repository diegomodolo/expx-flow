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
    (b.validation_response_time_ms || 0) - (a.validation_response_time_ms || 0)
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
    if (ms > 3000) return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <Card className="border-yellow-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-yellow-600" />
          URLs Lentas (&gt;3s)
          {urls.length > 0 && (
            <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-600">
              {urls.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma URL com tempo de resposta alto
          </p>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-3">
              {sortedUrls.slice(0, 10).map((url) => (
                <div 
                  key={url.id} 
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {url.client_name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs shrink-0 ${getSpeedColor(url.validation_response_time_ms)}`}
                      >
                        {formatResponseTime(url.validation_response_time_ms)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {url.url}
                    </p>
                    {url.label && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {url.label}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    asChild
                  >
                    <a href={url.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
              {urls.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  E mais {urls.length - 10} URLs...
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
