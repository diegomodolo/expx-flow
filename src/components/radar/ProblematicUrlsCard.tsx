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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            URLs Problemáticas
            {urls.length > 0 && (
              <Badge variant="destructive" className="ml-2">
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
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isValidating ? 'animate-spin' : ''}`} />
              Revalidar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {urls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma URL com erro ou timeout
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
                      {url.validation_status === 'error' ? (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          <XCircle className="h-3 w-3 mr-1" />
                          {url.validation_http_code || 'Erro'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-600 shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Timeout
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {url.url}
                    </p>
                    {url.validation_error && (
                      <p className="text-xs text-destructive truncate">
                        {url.validation_error}
                      </p>
                    )}
                    {url.last_validated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Validado {formatDistanceToNow(new Date(url.last_validated_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onValidate(url.id)}
                      disabled={isValidating}
                    >
                      <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
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
