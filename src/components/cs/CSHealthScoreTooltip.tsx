import React from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Settings, 
  Heart, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface HealthPillarData {
  financial: number;
  operational: number;
  relational: number;
  total: number;
  
  // Details for tooltips
  currentRoas?: number | null;
  targetRoas?: number;
  activeCampaigns?: number;
  daysSinceContact?: number | null;
  npsScore?: number | null;
}

interface CSHealthScoreTooltipProps {
  clientId: string;
  healthScore: number;
  pillarData: HealthPillarData;
  children: React.ReactNode;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getStatusIcon(score: number) {
  if (score >= 70) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (score >= 40) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <AlertTriangle className="h-4 w-4 text-red-500" />;
}

function getStatusLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'OK', color: 'text-green-600 dark:text-green-400' };
  if (score >= 40) return { label: 'Atenção', color: 'text-yellow-600 dark:text-yellow-400' };
  return { label: 'Problema', color: 'text-red-600 dark:text-red-400' };
}

export function CSHealthScoreTooltip({ 
  clientId, 
  healthScore, 
  pillarData, 
  children 
}: CSHealthScoreTooltipProps) {
  const navigate = useNavigate();

  const pillars = [
    {
      icon: DollarSign,
      label: 'Financeiro',
      score: pillarData.financial,
      detail: pillarData.currentRoas !== null && pillarData.targetRoas
        ? `ROAS: ${pillarData.currentRoas?.toFixed(1)}x (meta: ${pillarData.targetRoas}x)`
        : 'Sem dados de ROAS',
      iconColor: 'text-green-600',
    },
    {
      icon: Settings,
      label: 'Operacional',
      score: pillarData.operational,
      detail: `${pillarData.activeCampaigns || 0} campanha(s) ativa(s)`,
      iconColor: 'text-blue-600',
    },
    {
      icon: Heart,
      label: 'Relacional',
      score: pillarData.relational,
      detail: pillarData.daysSinceContact !== null
        ? `Último contato: ${pillarData.daysSinceContact} dias atrás`
        : 'Nunca contatado',
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="start">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Análise do Health Score</span>
            <Badge variant="outline" className={cn("font-bold", getScoreColor(healthScore))}>
              {healthScore}%
            </Badge>
          </div>
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={cn("h-full transition-all", getProgressColor(healthScore))}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {pillars.map((pillar) => {
            const status = getStatusLabel(pillar.score);
            const Icon = pillar.icon;
            
            return (
              <div key={pillar.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", pillar.iconColor)} />
                    <span className="text-sm font-medium">{pillar.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", getScoreColor(pillar.score))}>
                      {pillar.score}
                    </span>
                    {getStatusIcon(pillar.score)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  → {pillar.detail}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="p-3 border-t bg-muted/20">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => navigate(`/clientes/${clientId}/cs`)}
          >
            Ver detalhes completos
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
