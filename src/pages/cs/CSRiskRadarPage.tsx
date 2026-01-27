import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Activity, Star, Users } from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSRiskRadar } from '@/components/cs/CSRiskRadar';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';

export default function CSRiskRadarPage() {
  const { healthData, stats, isLoading } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();
  
  // Filtrar por squad se selecionado
  const filteredHealthData = useMemo(() => {
    if (!selectedSquadId) return healthData;
    return healthData.filter(c => c.squadId === selectedSquadId);
  }, [healthData, selectedSquadId]);

  // Recalcular stats filtradas
  const filteredStats = useMemo(() => {
    const data = filteredHealthData;
    const critical = data.filter(c => c.churnRiskLevel === 'critical').length;
    const high = data.filter(c => c.churnRiskLevel === 'high').length;
    const averageScore = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + c.healthScoreTotal, 0) / data.length)
      : 0;
    const npsClients = data.filter(c => c.npsScore !== null);
    const averageNps = npsClients.length > 0
      ? Math.round(npsClients.reduce((sum, c) => sum + (c.npsScore || 0), 0) / npsClients.length * 10) / 10
      : 0;
    return { critical, high, averageScore, averageNps };
  }, [filteredHealthData]);
  
  const riskClients = filteredHealthData.filter(c => c.churnRiskLevel === 'critical' || c.churnRiskLevel === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Radar de Risco
          </h1>
          <p className="text-muted-foreground">
            Clientes em risco de churn que precisam de atenção imediata
          </p>
        </div>
        <CSSquadFilter />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Crítico</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{filteredStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Alto Risco</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{filteredStats.high}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">NPS Médio</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredStats.averageNps || '-'}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Saúde Média</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{filteredStats.averageScore}%</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Radar */}
      <CSRiskRadar clients={riskClients} isLoading={isLoading} />
    </div>
  );
}
