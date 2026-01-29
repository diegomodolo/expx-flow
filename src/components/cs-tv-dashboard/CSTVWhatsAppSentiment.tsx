import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ThumbsUp, Minus, ThumbsDown, Bell, TrendingUp, Clock, Sunrise } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppSentiment {
  totalConversations: number;
  positiveConversations: number;
  neutralConversations: number;
  negativeConversations: number;
  averageScore: number | null;
  activeAlerts: number;
  averageResponseTimeMinutes?: number | null;
  averageFirstResponseTimeMinutes?: number | null;
}

interface CSTVWhatsAppSentimentProps {
  sentiment: WhatsAppSentiment;
}

function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

export function CSTVWhatsAppSentiment({ sentiment }: CSTVWhatsAppSentimentProps) {
  const total = sentiment.positiveConversations + sentiment.neutralConversations + sentiment.negativeConversations;
  
  const positivePercent = total > 0 ? (sentiment.positiveConversations / total) * 100 : 0;
  const neutralPercent = total > 0 ? (sentiment.neutralConversations / total) * 100 : 0;
  const negativePercent = total > 0 ? (sentiment.negativeConversations / total) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Sentimento WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sentiment Bar */}
        <div className="space-y-2">
          <div className="flex h-8 rounded-full overflow-hidden bg-muted">
            {positivePercent > 0 && (
              <div 
                className="bg-emerald-500 flex items-center justify-center transition-all"
                style={{ width: `${positivePercent}%` }}
              >
                {positivePercent >= 15 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round(positivePercent)}%
                  </span>
                )}
              </div>
            )}
            {neutralPercent > 0 && (
              <div 
                className="bg-amber-500 flex items-center justify-center transition-all"
                style={{ width: `${neutralPercent}%` }}
              >
                {neutralPercent >= 15 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round(neutralPercent)}%
                  </span>
                )}
              </div>
            )}
            {negativePercent > 0 && (
              <div 
                className="bg-red-500 flex items-center justify-center transition-all"
                style={{ width: `${negativePercent}%` }}
              >
                {negativePercent >= 15 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round(negativePercent)}%
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Positivo:</span>
              <span className="font-semibold text-emerald-500">{sentiment.positiveConversations}</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">Neutro:</span>
              <span className="font-semibold text-amber-500">{sentiment.neutralConversations}</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <span className="text-muted-foreground">Negativo:</span>
              <span className="font-semibold text-red-500">{sentiment.negativeConversations}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <MessageCircle className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-foreground">{sentiment.totalConversations}</p>
            <p className="text-xs text-muted-foreground">Conversas</p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">
              {sentiment.averageScore !== null ? sentiment.averageScore.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Score Médio</p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <Sunrise className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-foreground">
              {formatResponseTime(sentiment.averageFirstResponseTimeMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">1ª Resposta</p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <Clock className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">
              {formatResponseTime(sentiment.averageResponseTimeMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">Tempo Médio</p>
          </div>
          
          <div className={cn(
            "text-center p-4 rounded-xl",
            sentiment.activeAlerts > 0 ? "bg-red-500/10" : "bg-muted/50"
          )}>
            <Bell className={cn(
              "w-5 h-5 mx-auto mb-2",
              sentiment.activeAlerts > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"
            )} />
            <p className={cn(
              "text-2xl font-bold",
              sentiment.activeAlerts > 0 ? "text-red-500" : "text-foreground"
            )}>
              {sentiment.activeAlerts}
            </p>
            <p className="text-xs text-muted-foreground">Alertas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
