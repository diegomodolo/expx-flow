import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldAlert, ExternalLink, Search, AlertTriangle } from "lucide-react";
import { RadarUrl } from "@/hooks/useRadarUrls";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SuspiciousUrlsCardProps {
  urls: RadarUrl[];
  onAnalyze: (urlId: string) => void;
  onAnalyzeAll: () => void;
  isAnalyzing: boolean;
}

export function SuspiciousUrlsCard({ 
  urls, 
  onAnalyze, 
  onAnalyzeAll,
  isAnalyzing 
}: SuspiciousUrlsCardProps) {
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-500';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-red-600 dark:text-red-500';
  };

  const getScoreBg = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'bg-muted';
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 50) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  return (
    <Card className="border-orange-500/30 flex flex-col h-full">
      <CardHeader className="pb-2 px-3 pt-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ShieldAlert className="h-3.5 w-3.5 text-orange-600 dark:text-orange-500" />
            Suspeitas
            {urls.length > 0 && (
              <Badge variant="outline" className="ml-1 h-5 text-xs text-orange-600 dark:text-orange-500 border-orange-500">
                {urls.length}
              </Badge>
            )}
          </CardTitle>
          {urls.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAnalyzeAll}
              disabled={isAnalyzing}
              className="h-6 px-2 text-[10px]"
            >
              <Search className={`h-2.5 w-2.5 mr-1 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              Reanalisar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex-1 min-h-0">
        {urls.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-xs text-muted-foreground text-center">
              Nenhuma URL com conteúdo suspeito
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <div className="space-y-1.5 pr-2">
              {urls.slice(0, 10).map((url) => (
                <TooltipProvider key={url.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs truncate max-w-[80px]">
                              {url.client_name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] h-4 px-1 shrink-0 ${getScoreColor(url.content_match_score)} border-current`}
                            >
                              <AlertTriangle className="h-2 w-2 mr-0.5" />
                              {url.content_match_score ?? '?'}%
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {url.url}
                          </p>
                        </div>
                        <div className="flex items-center shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnalyze(url.id);
                            }}
                            disabled={isAnalyzing}
                          >
                            <Search className={`h-2.5 w-2.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            asChild
                          >
                            <a 
                              href={url.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[300px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Score:</span>
                          <span className={`text-xs font-bold ${getScoreColor(url.content_match_score)}`}>
                            {url.content_match_score ?? 'N/A'}%
                          </span>
                        </div>
                        {url.content_analysis_summary && (
                          <p className="text-xs text-muted-foreground">
                            {url.content_analysis_summary}
                          </p>
                        )}
                        {url.content_analyzed_at && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Analisado {formatDistanceToNow(new Date(url.content_analyzed_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
