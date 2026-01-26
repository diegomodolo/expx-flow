import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNPSResponses } from "@/hooks/useNPSResponses";
import { Star, TrendingUp, TrendingDown, Minus, AlertCircle, Check, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CSNPSTrackerProps {
  clientId?: string;
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'text-green-500';
  if (score >= 7) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreIcon(score: number) {
  if (score >= 9) return ThumbsUp;
  if (score >= 7) return Meh;
  return ThumbsDown;
}

export function CSNPSTracker({ clientId }: CSNPSTrackerProps) {
  const { 
    responses, 
    promoters, 
    passives, 
    detractors, 
    npsScore, 
    pendingFollowUps,
    isLoading,
    markFollowUpDone 
  } = useNPSResponses(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            NPS Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = promoters + passives + detractors;
  const promotersPct = total > 0 ? (promoters / total) * 100 : 0;
  const passivesPct = total > 0 ? (passives / total) * 100 : 0;
  const detractorsPct = total > 0 ? (detractors / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            NPS Tracker
          </CardTitle>
          {pendingFollowUps.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" />
              {pendingFollowUps.length} follow-up(s) pendente(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NPS Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">NPS Score</p>
              <p className={cn(
                "text-5xl font-bold",
                npsScore !== null && npsScore >= 50 ? 'text-green-500' : 
                npsScore !== null && npsScore >= 0 ? 'text-amber-500' : 'text-red-500'
              )}>
                {npsScore !== null ? npsScore : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {total} respostas
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardContent className="pt-6 space-y-3">
              {/* Promoters */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    Promotores (9-10)
                  </span>
                  <span className="font-medium text-green-500">{promoters} ({Math.round(promotersPct)}%)</span>
                </div>
                <Progress value={promotersPct} className="h-2 bg-muted" />
              </div>

              {/* Passives */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Meh className="h-4 w-4 text-amber-500" />
                    Passivos (7-8)
                  </span>
                  <span className="font-medium text-amber-500">{passives} ({Math.round(passivesPct)}%)</span>
                </div>
                <Progress value={passivesPct} className="h-2 bg-muted" />
              </div>

              {/* Detractors */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    Detratores (0-6)
                  </span>
                  <span className="font-medium text-red-500">{detractors} ({Math.round(detractorsPct)}%)</span>
                </div>
                <Progress value={detractorsPct} className="h-2 bg-muted" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Responses */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Respostas Recentes
          </h4>
          
          {responses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma resposta NPS ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {responses.slice(0, 5).map((response) => {
                const Icon = getScoreIcon(response.score);
                const colorClass = getScoreColor(response.score);
                const needsFollowUp = response.score <= 6 && !response.followUpDone;

                return (
                  <div
                    key={response.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border",
                      needsFollowUp && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className={cn("text-3xl font-bold w-12 text-center", colorClass)}>
                      {response.score}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {response.clients && (
                          <span className="font-medium">{response.clients.name}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {response.triggerType === 'monthly' ? 'Mensal' : 
                           response.triggerType === 'qbr' ? 'QBR' : 'Entrega'}
                        </Badge>
                        {response.followUpDone && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Follow-up feito
                          </Badge>
                        )}
                      </div>
                      {response.feedback && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          "{response.feedback}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(response.respondedAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>

                    {needsFollowUp && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markFollowUpDone.mutate({ id: response.id })}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Marcar follow-up
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
