import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Activity, Star, Users } from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSHealthScore360Card } from '@/components/cs/CSHealthScore360Card';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';

export default function CSHealth360Page() {
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
    const low = data.filter(c => c.churnRiskLevel === 'low').length;
    const averageScore = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + c.healthScoreTotal, 0) / data.length)
      : 0;
    const npsClients = data.filter(c => c.npsScore !== null);
    const averageNps = npsClients.length > 0
      ? Math.round(npsClients.reduce((sum, c) => sum + (c.npsScore || 0), 0) / npsClients.length * 10) / 10
      : 0;
    return { low, averageScore, averageNps, total: data.length };
  }, [filteredHealthData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Saúde 360
          </h1>
          <p className="text-muted-foreground">
            Visão completa da saúde de todos os clientes
          </p>
        </div>
        <CSSquadFilter />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Saúde Média</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{filteredStats.averageScore}%</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Baixo Risco</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{filteredStats.low}</p>
              </div>
              <Heart className="h-8 w-8 text-emerald-500" />
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

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Clientes</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{filteredStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-48 bg-muted/50" />
            </Card>
          ))
        ) : filteredHealthData.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente configurado</h3>
              <p className="text-muted-foreground mb-4">
                Configure o Health Score 360 para seus clientes para começar a monitorar a saúde
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHealthData.map((client) => (
            <CSHealthScore360Card key={client.id} data={client} />
          ))
        )}
      </div>
    </div>
  );
}
