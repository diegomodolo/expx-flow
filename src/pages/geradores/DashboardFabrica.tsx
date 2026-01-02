import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Factory, TrendingUp, CheckCircle2, XCircle, Clock, Zap, BarChart3, Target } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FactoryStats {
  total_generated: number;
  pending: number;
  approved: number;
  rejected: number;
  published: number;
  by_type: {
    clone: number;
    concept: number;
    iteration: number;
  };
  avg_quality_score: number;
  approval_rate: number;
  winners_count: number;
}

export default function DashboardFabrica() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { clients, loading: clientsLoading } = useClients();
  const { activeCompany } = useCompany();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['factory-stats', selectedClientId, activeCompany?.company_id],
    queryFn: async (): Promise<FactoryStats> => {
      if (!activeCompany?.company_id) {
        return getEmptyStats();
      }

      // Fetch queue stats
      let queueQuery = supabase
        .from('ad_generation_queue')
        .select('status, generation_type, quality_score')
        .eq('company_id', activeCompany.company_id);

      if (selectedClientId) {
        queueQuery = queueQuery.eq('client_id', selectedClientId);
      }

      const { data: queueData, error: queueError } = await queueQuery;

      if (queueError) throw queueError;

      // Fetch winners count
      let winnersQuery = supabase
        .from('ad_performance_winners')
        .select('id', { count: 'exact' })
        .eq('company_id', activeCompany.company_id)
        .eq('is_winner', true);

      if (selectedClientId) {
        winnersQuery = winnersQuery.eq('client_id', selectedClientId);
      }

      const { count: winnersCount } = await winnersQuery;

      // Calculate stats
      const total = queueData?.length || 0;
      const pending = queueData?.filter(q => q.status === 'pending').length || 0;
      const approved = queueData?.filter(q => q.status === 'approved').length || 0;
      const rejected = queueData?.filter(q => q.status === 'rejected').length || 0;
      const published = queueData?.filter(q => q.status === 'published').length || 0;

      const clones = queueData?.filter(q => q.generation_type === 'clone').length || 0;
      const concepts = queueData?.filter(q => q.generation_type === 'concept').length || 0;
      const iterations = queueData?.filter(q => q.generation_type === 'iteration').length || 0;

      const qualityScores = queueData?.filter(q => q.quality_score).map(q => q.quality_score as number) || [];
      const avgQuality = qualityScores.length > 0 
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
        : 0;

      const reviewed = approved + rejected;
      const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;

      return {
        total_generated: total,
        pending,
        approved,
        rejected,
        published,
        by_type: {
          clone: clones,
          concept: concepts,
          iteration: iterations,
        },
        avg_quality_score: avgQuality,
        approval_rate: approvalRate,
        winners_count: winnersCount || 0,
      };
    },
    enabled: !!activeCompany?.company_id,
  });

  function getEmptyStats(): FactoryStats {
    return {
      total_generated: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      published: 0,
      by_type: { clone: 0, concept: 0, iteration: 0 },
      avg_quality_score: 0,
      approval_rate: 0,
      winners_count: 0,
    };
  }

  const statCards = [
    {
      title: 'Total Gerados',
      value: stats?.total_generated || 0,
      icon: Factory,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Aguardando Revisão',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Aprovados',
      value: stats?.approved || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Rejeitados',
      value: stats?.rejected || 0,
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      title: 'Publicados',
      value: stats?.published || 0,
      icon: Zap,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Vencedores',
      value: stats?.winners_count || 0,
      icon: Target,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8 text-primary" />
              Dashboard da Fábrica de Anúncios
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe as métricas de geração, aprovação e publicação de anúncios
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select
                  value={selectedClientId || 'all'}
                  onValueChange={(val) => setSelectedClientId(val === 'all' ? null : val)}
                  disabled={clientsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stat.bg}`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* By Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Por Tipo de Geração
                  </CardTitle>
                  <CardDescription>Distribuição dos anúncios gerados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        Clone
                      </Badge>
                    </div>
                    <span className="font-semibold">{stats?.by_type.clone || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                        Conceito
                      </Badge>
                    </div>
                    <span className="font-semibold">{stats?.by_type.concept || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Iteração
                      </Badge>
                    </div>
                    <span className="font-semibold">{stats?.by_type.iteration || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quality & Approval */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance
                  </CardTitle>
                  <CardDescription>Métricas de qualidade e aprovação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de Aprovação</span>
                      <span className="font-semibold text-green-600">
                        {(stats?.approval_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${stats?.approval_rate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score Médio de Qualidade</span>
                      <span className="font-semibold text-blue-600">
                        {((stats?.avg_quality_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(stats?.avg_quality_score || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Funil de Produção
                  </CardTitle>
                  <CardDescription>Fluxo dos anúncios gerados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="flex-1 text-sm">Gerados</span>
                      <span className="font-semibold">{stats?.total_generated || 0}</span>
                    </div>
                    <div className="ml-1.5 w-0.5 h-4 bg-muted" />
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="flex-1 text-sm">Em Revisão</span>
                      <span className="font-semibold">{stats?.pending || 0}</span>
                    </div>
                    <div className="ml-1.5 w-0.5 h-4 bg-muted" />
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="flex-1 text-sm">Aprovados</span>
                      <span className="font-semibold">{stats?.approved || 0}</span>
                    </div>
                    <div className="ml-1.5 w-0.5 h-4 bg-muted" />
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="flex-1 text-sm">Publicados</span>
                      <span className="font-semibold">{stats?.published || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
