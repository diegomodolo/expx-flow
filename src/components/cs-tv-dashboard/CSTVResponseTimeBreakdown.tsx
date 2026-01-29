import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseTimeBreakdown {
  under5min: number;
  under15min: number;
  under30min: number;
  under1hour: number;
  over1hour: number;
}

interface CSTVResponseTimeBreakdownProps {
  breakdown: ResponseTimeBreakdown;
}

export function CSTVResponseTimeBreakdown({ breakdown }: CSTVResponseTimeBreakdownProps) {
  const total = breakdown.under5min + breakdown.under15min + breakdown.under30min + breakdown.under1hour + breakdown.over1hour;
  
  const segments = [
    { 
      label: '<5min', 
      value: breakdown.under5min, 
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      icon: CheckCircle 
    },
    { 
      label: '5-15min', 
      value: breakdown.under15min, 
      color: 'bg-green-500',
      textColor: 'text-green-500',
      icon: CheckCircle 
    },
    { 
      label: '15-30min', 
      value: breakdown.under30min, 
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      icon: Clock 
    },
    { 
      label: '30-60min', 
      value: breakdown.under1hour, 
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      icon: Clock 
    },
    { 
      label: '>1h', 
      value: breakdown.over1hour, 
      color: 'bg-red-500',
      textColor: 'text-red-500',
      icon: AlertTriangle 
    },
  ];

  const goodResponses = breakdown.under5min + breakdown.under15min;
  const goodPercent = total > 0 ? Math.round((goodResponses / total) * 100) : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Timer className="w-5 h-5 text-primary" />
            Tempo de Resposta
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-bold",
              goodPercent >= 70 ? "text-emerald-500" : 
              goodPercent >= 50 ? "text-amber-500" : "text-red-500"
            )}>
              {goodPercent}% em até 15min
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="flex h-6 rounded-full overflow-hidden bg-muted">
          {segments.map((segment, index) => {
            const percent = total > 0 ? (segment.value / total) * 100 : 0;
            if (percent === 0) return null;
            
            return (
              <div 
                key={segment.label}
                className={cn(segment.color, "flex items-center justify-center transition-all")}
                style={{ width: `${percent}%` }}
              >
                {percent >= 10 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round(percent)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend grid */}
        <div className="grid grid-cols-5 gap-2">
          {segments.map((segment) => {
            const Icon = segment.icon;
            const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
            
            return (
              <div 
                key={segment.label}
                className="flex flex-col items-center p-2 rounded-lg bg-muted/50"
              >
                <Icon className={cn("w-4 h-4 mb-1", segment.textColor)} />
                <span className={cn("text-lg font-bold", segment.textColor)}>
                  {segment.value}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {segment.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
