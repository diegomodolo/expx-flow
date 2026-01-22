import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, ExternalLink, ArrowRight } from "lucide-react";
import { RadarUrl } from "@/hooks/useRadarUrls";

interface RedirectUrlsCardProps {
  urls: RadarUrl[];
}

export function RedirectUrlsCard({ urls }: RedirectUrlsCardProps) {
  return (
    <Card className="border-blue-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          URLs com Redirect
          {urls.length > 0 && (
            <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
              {urls.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma URL com redirecionamento
          </p>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-3">
              {urls.slice(0, 10).map((url) => (
                <div 
                  key={url.id} 
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {url.client_name}
                      </span>
                      {url.validation_http_code && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-600 shrink-0">
                          {url.validation_http_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {url.url}
                    </p>
                    {url.validation_final_url && url.validation_final_url !== url.url && (
                      <div className="flex items-center gap-1 text-xs">
                        <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="text-blue-600 truncate">
                          {url.validation_final_url}
                        </span>
                      </div>
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
