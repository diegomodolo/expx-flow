import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Briefcase, AlertTriangle, AlertCircle, AlertOctagon, CheckCircle2, Activity, Star, Users } from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSHealthScore360Card } from '@/components/cs/CSHealthScore360Card';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';
import { cn } from '@/lib/utils';

type RiskFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

const riskTabs: { value: RiskFilter; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all', label: 'Todos', icon: Briefcase, color: '' },
  { value: 'critical', label: 'Críticos', icon: AlertOctagon, color: 'text-red-600' },
  { value: 'high', label: 'Alto', icon: AlertTriangle, color: 'text-orange-600' },
  { value: 'medium', label: 'Médio', icon: AlertCircle, color: 'text-yellow-600' },
  { value: 'low', label: 'Baixo', icon: CheckCircle2, color: 'text-green-600' },
];

export default function CSPortfolioPage() {
  const { healthData, stats, isLoading } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  // Filtrar por squad se selecionado
  const squadFilteredData = useMemo(() => {
    if (!selectedSquadId) return healthData;
    return healthData.filter(c => c.squadId === selectedSquadId);
  }, [healthData, selectedSquadId]);

  // Filtrar por risco
  const filteredData = useMemo(() => {
    if (riskFilter === 'all') return squadFilteredData;
    return squadFilteredData.filter(c => c.churnRiskLevel === riskFilter);
  }, [squadFilteredData, riskFilter]);

  // Calcular contagens por risco
  const riskCounts = useMemo(() => ({
    all: squadFilteredData.length,
    critical: squadFilteredData.filter(c => c.churnRiskLevel === 'critical').length,
    high: squadFilteredData.filter(c => c.churnRiskLevel === 'high').length,
    medium: squadFilteredData.filter(c => c.churnRiskLevel === 'medium').length,
    low: squadFilteredData.filter(c => c.churnRiskLevel === 'low').length,
  }), [squadFilteredData]);

  // Recalcular stats filtradas
  const filteredStats = useMemo(() => {
    const data = squadFilteredData;
    const averageScore = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + c.healthScoreTotal, 0) / data.length)
      : 0;
    const npsClients = data.filter(c => c.npsScore !== null);
    const averageNps = npsClients.length > 0
      ? Math.round(npsClients.reduce((sum, c) => sum + (c.npsScore || 0), 0) / npsClients.length * 10) / 10
      : 0;
    return { averageScore, averageNps, total: data.length };
  }, [squadFilteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Saúde da Carteira
          </h1>
          <p className="text-muted-foreground">
            Visão consolidada da saúde de todos os clientes
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

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Risco Crítico</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{riskCounts.critical}</p>
              </div>
              <AlertOctagon className="h-8 w-8 text-red-500" />
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

      {/* Risk Filter Tabs */}
      <Tabs value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          {riskTabs.map((tab) => {
            const Icon = tab.icon;
            const count = riskCounts[tab.value];
            
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex items-center gap-2 data-[state=active]:shadow-sm",
                  tab.value !== 'all' && "data-[state=active]:bg-card"
                )}
              >
                <Icon className={cn("h-4 w-4", tab.color)} />
                <span>{tab.label}</span>
                <Badge 
                  variant={riskFilter === tab.value ? "default" : "outline"} 
                  className={cn(
                    "ml-1 rounded-full h-5 min-w-5 text-xs",
                    tab.value === 'critical' && count > 0 && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                    tab.value === 'high' && count > 0 && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-48 bg-muted/50" />
            </Card>
          ))
        ) : filteredData.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {riskFilter === 'all' ? 'Nenhum cliente configurado' : `Nenhum cliente com risco ${riskTabs.find(t => t.value === riskFilter)?.label}`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {riskFilter === 'all' 
                  ? 'Configure o Health Score 360 para seus clientes' 
                  : 'Altere o filtro para ver outros clientes'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((client) => (
            <CSHealthScore360Card key={client.id} data={client} />
          ))
        )}
      </div>
    </div>
  );
}
