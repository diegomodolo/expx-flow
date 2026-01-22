import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, ExternalLink, RefreshCw, XCircle, Clock } from "lucide-react";
import { RadarUrl } from "@/hooks/useRadarUrls";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProblematicUrlsCardProps {
  urls: RadarUrl[];
  onValidate: (urlId: string) => void;
  onValidateAll: () => void;
  isValidating: boolean;
}

export function ProblematicUrlsCard({ 
  urls, 
  onValidate, 
  onValidateAll,
  isValidating 
}: ProblematicUrlsCardProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Problemáticas
            {urls.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 text-xs">
                {urls.length}
              </Badge>
            )}
          </CardTitle>
          {urls.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onValidateAll}
              disabled={isValidating}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isValidating ? 'animate-spin' : ''}`} />
              Revalidar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {urls.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma URL com erro ou timeout
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
                      {url.validation_status === 'error' ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1">
                          <XCircle className="h-2.5 w-2.5 mr-0.5" />
                          {url.validation_http_code || 'Erro'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-600 border-orange-600">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          Timeout
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {url.url}
                    </p>
                    {url.last_validated_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(url.last_validated_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onValidate(url.id)}
                      disabled={isValidating}
                    >
                      <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      asChild
                    >
                      <a href={url.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
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
