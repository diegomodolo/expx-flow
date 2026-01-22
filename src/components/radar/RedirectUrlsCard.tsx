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
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
          Redirects
          {urls.length > 0 && (
            <Badge variant="outline" className="ml-1 h-5 text-xs text-blue-600 dark:text-blue-500 border-blue-600">
              {urls.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {urls.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma URL com redirecionamento
          </p>
        ) : (
          <ScrollArea className="h-[200px] pr-2">
            <div className="space-y-2">
              {urls.slice(0, 10).map((url) => (
                <div 
                  key={url.id} 
                  className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-xs truncate">
                        {url.client_name}
                      </span>
                      {url.validation_http_code && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-blue-600 dark:text-blue-500 border-blue-600">
                          {url.validation_http_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {url.url}
                    </p>
                    {url.validation_final_url && url.validation_final_url !== url.url && (
                      <div className="flex items-center gap-0.5 text-[10px] mt-0.5">
                        <ArrowRight className="h-2.5 w-2.5 text-blue-600 dark:text-blue-500 shrink-0" />
                        <span className="text-blue-600 dark:text-blue-500 truncate">
                          {url.validation_final_url}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    asChild
                  >
                    <a href={url.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
              {urls.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">
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
