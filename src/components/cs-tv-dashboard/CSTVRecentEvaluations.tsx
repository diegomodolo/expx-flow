import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentEvaluation {
  id: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
  score: number | null;
  temperature: string;
  interpretation: string | null;
  analyzedAt: string;
}

interface CSTVRecentEvaluationsProps {
  evaluations: RecentEvaluation[];
}

export function CSTVRecentEvaluations({ evaluations }: CSTVRecentEvaluationsProps) {
  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'positive':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'neutral':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'negative':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getTemperatureLabel = (temperature: string) => {
    switch (temperature) {
      case 'positive':
        return 'Positivo';
      case 'neutral':
        return 'Neutro';
      case 'negative':
        return 'Negativo';
      default:
        return temperature;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  if (evaluations.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            Últimas Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhuma avaliação recente</p>
            <p className="text-sm text-muted-foreground">As análises da IA aparecerão aqui em tempo real.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          Últimas Avaliações
          <Badge variant="outline" className="ml-2">
            {evaluations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {evaluations.map((evaluation) => (
            <div 
              key={evaluation.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border",
                getTemperatureColor(evaluation.temperature)
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                evaluation.temperature === 'positive' && "bg-emerald-500/20",
                evaluation.temperature === 'neutral' && "bg-amber-500/20",
                evaluation.temperature === 'negative' && "bg-red-500/20"
              )}>
                <User className={cn(
                  "w-5 h-5",
                  evaluation.temperature === 'positive' && "text-emerald-500",
                  evaluation.temperature === 'neutral' && "text-amber-500",
                  evaluation.temperature === 'negative' && "text-red-500"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground truncate">
                    {evaluation.contactName !== 'Sem nome' 
                      ? evaluation.contactName 
                      : evaluation.contactPhone || 'Contato desconhecido'}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0", getTemperatureColor(evaluation.temperature))}
                  >
                    {getTemperatureLabel(evaluation.temperature)}
                  </Badge>
                </div>
                
                {evaluation.interpretation && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {evaluation.interpretation}
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {evaluation.clientName && (
                    <span className="truncate text-primary/80 font-medium">
                      🏢 {evaluation.clientName}
                    </span>
                  )}
                  {evaluation.attendantName && (
                    <span className="truncate text-blue-500">
                      👤 {evaluation.attendantName}
                    </span>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(evaluation.analyzedAt), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <p className={cn(
                  "text-xl font-bold",
                  getScoreColor(evaluation.score)
                )}>
                  {evaluation.score !== null ? evaluation.score.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Nota</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
