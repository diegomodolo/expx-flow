import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, Minus, ThumbsDown, PieChart } from 'lucide-react';

interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

interface CSTVSentimentBarProps {
  sentiment: SentimentDistribution;
}

export function CSTVSentimentBar({ sentiment }: CSTVSentimentBarProps) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  
  const positivePercent = total > 0 ? (sentiment.positive / total) * 100 : 0;
  const neutralPercent = total > 0 ? (sentiment.neutral / total) * 100 : 0;
  const negativePercent = total > 0 ? (sentiment.negative / total) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="w-5 h-5 text-primary" />
          Distribuição de Sentimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentiment Bar */}
        <div className="space-y-2">
          <div className="flex h-10 rounded-full overflow-hidden bg-muted">
            {positivePercent > 0 && (
              <div 
                className="bg-emerald-500 flex items-center justify-center transition-all"
                style={{ width: `${positivePercent}%` }}
              >
                {positivePercent >= 12 && (
                  <span className="text-sm text-white font-bold">
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
                {neutralPercent >= 12 && (
                  <span className="text-sm text-white font-bold">
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
                {negativePercent >= 12 && (
                  <span className="text-sm text-white font-bold">
                    {Math.round(negativePercent)}%
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between text-sm px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Positivo:</span>
              <span className="font-bold text-emerald-500">{sentiment.positive}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <Minus className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">Neutro:</span>
              <span className="font-bold text-amber-500">{sentiment.neutral}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <span className="text-muted-foreground">Negativo:</span>
              <span className="font-bold text-red-500">{sentiment.negative}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
