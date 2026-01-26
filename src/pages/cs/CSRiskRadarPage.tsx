import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Activity, Star, Users } from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSRiskRadar } from '@/components/cs/CSRiskRadar';

export default function CSRiskRadarPage() {
  const { healthData, stats, isLoading } = useCSHealthScore360();
  
  const riskClients = healthData.filter(c => c.churnRiskLevel === 'critical' || c.churnRiskLevel === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          Radar de Risco
        </h1>
        <p className="text-muted-foreground">
          Clientes em risco de churn que precisam de atenção imediata
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Crítico</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.critical}</p>
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
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.high}</p>
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
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.averageNps || '-'}</p>
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
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.averageScore}%</p>
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
