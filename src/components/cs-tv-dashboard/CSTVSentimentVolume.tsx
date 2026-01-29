import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThermometerSun } from 'lucide-react';
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
  const currentHour = new Date().getHours();
  
  // Calculate overall average score (only from hours with data)
  const hoursWithScores = safeHourlySentiment.filter(h => h.avgScore !== null && h.totalAnalyses > 0);
  const overallAvgScore = hoursWithScores.length > 0 
    ? Math.round((hoursWithScores.reduce((sum, h) => sum + (h.avgScore as number), 0) / hoursWithScores.length) * 10) / 10 
    : null;

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 7) return 'bg-emerald-500';
    if (score >= 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  const getTemperatureLabel = (score: number | null) => {
    if (score === null) return 'Sem dados';
    if (score >= 7) return 'Positivo';
    if (score >= 5) return 'Neutro';
    return 'Negativo';
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <ThermometerSun className="w-5 h-5 text-primary" />
            Termômetro do Dia
          </div>
          {overallAvgScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Média Geral:</span>
              <span className={cn("font-bold text-lg", getScoreTextColor(overallAvgScore))}>
                {overallAvgScore.toFixed(1)}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", getScoreColor(overallAvgScore), "text-white")}>
                {getTemperatureLabel(overallAvgScore)}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hour bars - average score visualization */}
        <div className="flex items-end gap-1 h-32">
          {safeHourlySentiment.map((hour) => {
            const hasData = hour.totalAnalyses > 0 && hour.avgScore !== null;
            const score = hour.avgScore;
            // Height based on score (0-10 scale mapped to 0-100%)
            const barHeight = hasData && score !== null ? (score / 10) * 100 : 5;
            const isCurrentHour = hour.hour === currentHour;
            
            return (
              <div 
                key={hour.hour} 
                className="flex-1 flex flex-col items-center gap-0.5 h-full"
                title={hasData 
                  ? `${hour.hour}h: Nota média ${score?.toFixed(1)} (${hour.totalAnalyses} análises)` 
                  : `${hour.hour}h: Sem análises`
                }
              >
                <div className="w-full flex flex-col justify-end h-full relative">
                  {/* Score label on top of bar */}
                  {hasData && score !== null && (
                    <div className={cn(
                      "text-[8px] font-bold text-center mb-0.5",
                      getScoreTextColor(score)
                    )}>
                      {score.toFixed(1)}
                    </div>
                  )}
                  <div 
                    className={cn(
                      "w-full rounded-t transition-all",
                      getScoreColor(score),
                      isCurrentHour ? 'opacity-100 ring-2 ring-primary ring-offset-1' : 'opacity-80'
                    )}
                    style={{ height: `${barHeight}%`, minHeight: hasData ? '8px' : '4px' }}
                  />
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
            <span className="text-muted-foreground">≥ 7 (Positivo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-muted-foreground">5-6.9 (Neutro)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-muted-foreground">{'< 5'} (Negativo)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
