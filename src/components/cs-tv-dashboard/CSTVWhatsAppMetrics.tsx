import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageCircle, 
  ThumbsUp, 
  Minus, 
  ThumbsDown, 
  Bell, 
  TrendingUp, 
  Clock, 
  Sunrise,
  MessageSquare,
  AlertTriangle,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppMetrics {
  totalConversations: number;
  activeConversations: number;
  positiveConversations: number;
  neutralConversations: number;
  negativeConversations: number;
  averageScore: number | null;
  activeAlerts: number;
  averageResponseTimeMinutes: number | null;
  averageFirstResponseTimeMinutes: number | null;
  totalMessagesToday: number;
  totalMessagesThisWeek: number;
  conversationsWithoutResponse: number;
  conversationsNeedingAttention: number;
}

interface CSTVWhatsAppMetricsProps {
  metrics: WhatsAppMetrics;
}

function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

export function CSTVWhatsAppMetrics({ metrics }: CSTVWhatsAppMetricsProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-muted/50';
    if (score >= 7) return 'bg-emerald-500/10';
    if (score >= 5) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Score Médio */}
      <Card className={cn("border-0 shadow-lg", getScoreBgColor(metrics.averageScore))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className={cn("w-5 h-5", getScoreColor(metrics.averageScore))} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Score Médio
            </span>
          </div>
          <p className={cn("text-3xl font-bold", getScoreColor(metrics.averageScore))}>
            {metrics.averageScore !== null ? metrics.averageScore.toFixed(1) : '-'}
            <span className="text-lg text-muted-foreground">/10</span>
          </p>
        </CardContent>
      </Card>

      {/* Conversas Ativas */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Ativas
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {metrics.activeConversations}
          </p>
          <p className="text-xs text-muted-foreground">
            de {metrics.totalConversations} total
          </p>
        </CardContent>
      </Card>

      {/* 1ª Resposta */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Sunrise className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              1ª Resposta
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatResponseTime(metrics.averageFirstResponseTimeMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">tempo médio</p>
        </CardContent>
      </Card>

      {/* Tempo Médio */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Resposta
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatResponseTime(metrics.averageResponseTimeMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">entre msgs</p>
        </CardContent>
      </Card>

      {/* Aguardando Resposta */}
      <Card className={cn(
        "border-0 shadow-lg",
        metrics.conversationsWithoutResponse > 0 ? "bg-orange-500/10" : "bg-card"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Inbox className={cn(
              "w-5 h-5",
              metrics.conversationsWithoutResponse > 0 ? "text-orange-500" : "text-muted-foreground"
            )} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Aguardando
            </span>
          </div>
          <p className={cn(
            "text-3xl font-bold",
            metrics.conversationsWithoutResponse > 0 ? "text-orange-500" : "text-foreground"
          )}>
            {metrics.conversationsWithoutResponse}
          </p>
          <p className="text-xs text-muted-foreground">sem resposta</p>
        </CardContent>
      </Card>

      {/* Alertas / Atenção */}
      <Card className={cn(
        "border-0 shadow-lg",
        metrics.conversationsNeedingAttention > 0 ? "bg-red-500/10" : "bg-card"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className={cn(
              "w-5 h-5",
              metrics.conversationsNeedingAttention > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"
            )} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Atenção
            </span>
          </div>
          <p className={cn(
            "text-3xl font-bold",
            metrics.conversationsNeedingAttention > 0 ? "text-red-500" : "text-foreground"
          )}>
            {metrics.conversationsNeedingAttention}
          </p>
          <p className="text-xs text-muted-foreground">precisam ação</p>
        </CardContent>
      </Card>
    </div>
  );
}
