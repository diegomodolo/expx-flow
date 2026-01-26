import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  Settings, 
  Heart,
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react';
import { HealthScore360Data } from '@/hooks/useCSHealthScore360';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CSHealthScore360CardProps {
  data: HealthScore360Data;
}

export function CSHealthScore360Card({ data }: CSHealthScore360CardProps) {
  const navigate = useNavigate();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      default: return level;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg',
        data.churnRiskLevel === 'critical' && 'border-red-200',
        data.churnRiskLevel === 'high' && 'border-orange-200',
      )}
      onClick={() => navigate(`/clientes/${data.clientId}/cs`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={data.clientAvatar || undefined} />
              <AvatarFallback>
                {data.clientName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{data.clientName}</CardTitle>
              <Badge variant="outline" className={cn('text-xs', getRiskColor(data.churnRiskLevel))}>
                Risco {getRiskLabel(data.churnRiskLevel)}
              </Badge>
            </div>
          </div>
          <div className={cn('text-3xl font-bold', getScoreColor(data.healthScoreTotal))}>
            {data.healthScoreTotal}%
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score Total Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Saúde Geral</span>
            <span>{data.healthScoreTotal}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full transition-all', getProgressColor(data.healthScoreTotal))}
              style={{ width: `${data.healthScoreTotal}%` }}
            />
          </div>
        </div>

        {/* 3 Pilares */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreFinancial))}>
              {data.healthScoreFinancial}
            </p>
            <p className="text-xs text-muted-foreground">Financeiro</p>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Settings className="h-4 w-4 mx-auto text-blue-600 mb-1" />
            <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreOperational))}>
              {data.healthScoreOperational}
            </p>
            <p className="text-xs text-muted-foreground">Operacional</p>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Heart className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreRelational))}>
              {data.healthScoreRelational}
            </p>
            <p className="text-xs text-muted-foreground">Relacional</p>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">ROAS:</span>
            <span className={cn('font-medium', data.currentRoas && data.currentRoas >= data.targetRoas ? 'text-green-600' : 'text-red-600')}>
              {data.currentRoas ? `${data.currentRoas.toFixed(1)}x` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">NPS:</span>
            <span className={cn('font-medium', 
              data.npsScore === null ? '' :
              data.npsScore >= 9 ? 'text-green-600' : 
              data.npsScore >= 7 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {data.npsScore ?? '-'}
            </span>
          </div>
        </div>

        {/* Fatores de Risco */}
        {data.riskFactors.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              {data.riskFactors.slice(0, 2).map((factor, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {factor}
                </Badge>
              ))}
              {data.riskFactors.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{data.riskFactors.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
