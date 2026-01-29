import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThermometerSun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourlySentiment {
  hour: number;
  positive: number;
  neutral: number;
  negative: number;
  avgScore: number | null;
  totalAnalyses: number;
}

interface CSTVSentimentVolumeProps {
  hourlySentiment: HourlySentiment[];
}

export function CSTVSentimentVolume({ hourlySentiment = [] }: CSTVSentimentVolumeProps) {
  const safeHourlySentiment = hourlySentiment || [];
  const maxVolume = Math.max(...safeHourlySentiment.map(h => h.totalAnalyses), 1);
  const currentHour = new Date().getHours();
  
  const todayPositive = safeHourlySentiment.reduce((sum, h) => sum + h.positive, 0);
  const todayNeutral = safeHourlySentiment.reduce((sum, h) => sum + h.neutral, 0);
  const todayNegative = safeHourlySentiment.reduce((sum, h) => sum + h.negative, 0);
  const todayTotal = todayPositive + todayNeutral + todayNegative;
  
  // Calculate overall average score
  const allScores = safeHourlySentiment.filter(h => h.avgScore !== null).map(h => h.avgScore as number);
  const overallAvgScore = allScores.length > 0 
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 
    : null;

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <ThermometerSun className="w-5 h-5 text-primary" />
            Termômetro do Dia
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-emerald-500">{todayPositive}</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-amber-500">{todayNeutral}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="font-bold text-red-500">{todayNegative}</span>
            </div>
            {overallAvgScore !== null && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-muted">
                <span className="text-muted-foreground">Média:</span>
                <span className={cn("font-bold", getScoreColor(overallAvgScore))}>
                  {overallAvgScore.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hour bars - stacked */}
        <div className="flex items-end gap-1 h-32">
          {safeHourlySentiment.map((hour) => {
            const totalHeight = (hour.totalAnalyses / maxVolume) * 100;
            const positiveHeight = hour.totalAnalyses > 0 ? (hour.positive / hour.totalAnalyses) * totalHeight : 0;
            const neutralHeight = hour.totalAnalyses > 0 ? (hour.neutral / hour.totalAnalyses) * totalHeight : 0;
            const negativeHeight = hour.totalAnalyses > 0 ? (hour.negative / hour.totalAnalyses) * totalHeight : 0;
            const isCurrentHour = hour.hour === currentHour;
            
            return (
              <div 
                key={hour.hour} 
                className="flex-1 flex flex-col items-center gap-0.5 h-full"
                title={`${hour.hour}h: ${hour.positive} positivas, ${hour.neutral} neutras, ${hour.negative} negativas${hour.avgScore !== null ? ` (média: ${hour.avgScore})` : ''}`}
              >
                <div className="w-full flex flex-col justify-end h-full">
                  {/* Stack: negative at bottom, then neutral, then positive on top */}
                  {negativeHeight > 0 && (
                    <div 
                      className={cn(
                        "w-full bg-red-500 transition-all",
                        neutralHeight === 0 && positiveHeight === 0 && "rounded-t",
                        isCurrentHour ? 'opacity-100' : 'opacity-70'
                      )}
                      style={{ height: `${negativeHeight}%` }}
                    />
                  )}
                  {neutralHeight > 0 && (
                    <div 
                      className={cn(
                        "w-full bg-amber-500 transition-all",
                        positiveHeight === 0 && "rounded-t",
                        isCurrentHour ? 'opacity-100' : 'opacity-70'
                      )}
                      style={{ height: `${neutralHeight}%` }}
                    />
                  )}
                  {positiveHeight > 0 && (
                    <div 
                      className={cn(
                        "w-full bg-emerald-500 rounded-t transition-all",
                        isCurrentHour ? 'opacity-100' : 'opacity-70'
                      )}
                      style={{ height: `${positiveHeight}%` }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px]",
                  isCurrentHour ? 'text-primary font-bold' : 'text-muted-foreground'
                )}>
                  {hour.hour}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">Positivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-muted-foreground">Neutro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-muted-foreground">Negativo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
