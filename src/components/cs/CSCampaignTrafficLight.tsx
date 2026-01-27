import React from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CampaignPerformance {
  active: number;
  onTarget: number;
  warning: number;
  critical: number;
  avgCPA?: number;
  targetCPA?: number;
  avgROAS?: number;
  targetROAS?: number;
}

interface CSCampaignTrafficLightProps {
  performance: CampaignPerformance;
  showCount?: boolean;
}

function getTrafficLightColor(performance: CampaignPerformance): 'green' | 'yellow' | 'red' {
  if (performance.active === 0) return 'red';
  if (performance.critical > 0) return 'red';
  if (performance.warning > 0) return 'yellow';
  return 'green';
}

const trafficConfig = {
  green: {
    bg: 'bg-green-500',
    border: 'border-green-400',
    text: 'text-green-700 dark:text-green-400',
    lightBg: 'bg-green-100 dark:bg-green-950',
    label: 'Batendo Meta',
  },
  yellow: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    text: 'text-yellow-700 dark:text-yellow-400',
    lightBg: 'bg-yellow-100 dark:bg-yellow-950',
    label: 'Atenção',
  },
  red: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    text: 'text-red-700 dark:text-red-400',
    lightBg: 'bg-red-100 dark:bg-red-950',
    label: 'Abaixo Meta',
  },
};

export function CSCampaignTrafficLight({ performance, showCount = true }: CSCampaignTrafficLightProps) {
  const color = getTrafficLightColor(performance);
  const config = trafficConfig[color];

  if (performance.active === 0) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Sem campanhas
      </Badge>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer transition-all hover:shadow-sm",
          config.lightBg
        )}>
          {/* Traffic light indicator */}
          <span className={cn(
            "w-2.5 h-2.5 rounded-full animate-pulse",
            config.bg
          )} />
          {showCount && (
            <span className={cn("text-sm font-medium", config.text)}>
              {performance.active}
            </span>
          )}
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent className="w-64 p-0" align="center">
        <div className={cn("p-3 border-b", config.lightBg)}>
          <div className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full", config.bg)} />
            <span className={cn("font-medium text-sm", config.text)}>
              {config.label}
            </span>
          </div>
        </div>
        
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 mx-auto flex items-center justify-center">
                <span className="text-xs font-bold text-green-600">{performance.onTarget}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Na meta</p>
            </div>
            <div>
              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-950 mx-auto flex items-center justify-center">
                <span className="text-xs font-bold text-yellow-600">{performance.warning}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Atenção</p>
            </div>
            <div>
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 mx-auto flex items-center justify-center">
                <span className="text-xs font-bold text-red-600">{performance.critical}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Crítico</p>
            </div>
          </div>
          
          {(performance.avgCPA || performance.avgROAS) && (
            <div className="pt-2 border-t space-y-1 text-xs">
              {performance.avgCPA && performance.targetCPA && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPA:</span>
                  <span className={cn(
                    "font-medium",
                    performance.avgCPA <= performance.targetCPA ? 'text-green-600' : 'text-red-600'
                  )}>
                    R$ {performance.avgCPA.toFixed(2)} (meta: R$ {performance.targetCPA.toFixed(2)})
                  </span>
                </div>
              )}
              {performance.avgROAS && performance.targetROAS && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROAS:</span>
                  <span className={cn(
                    "font-medium",
                    performance.avgROAS >= performance.targetROAS ? 'text-green-600' : 'text-red-600'
                  )}>
                    {performance.avgROAS.toFixed(1)}x (meta: {performance.targetROAS.toFixed(1)}x)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
