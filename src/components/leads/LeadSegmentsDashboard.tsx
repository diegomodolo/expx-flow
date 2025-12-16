import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Tag, Users, TrendingUp, Star, Trophy, Medal, Award, Trash2 } from "lucide-react";
import { LeadClassificationStats } from "./LeadClassificationStats";

interface SegmentMetrics {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  lead_count: number;
  avg_score: number;
  total_value: number;
  ouro_count: number;
  prata_count: number;
  bronze_count: number;
  descartado_count: number;
  last_lead_at: string | null;
}

export const LeadSegmentsDashboard = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: segments, isLoading } = useQuery({
    queryKey: ['lead-segments-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch all segments
      const { data: segmentsData } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (!segmentsData?.length) return [];

      // For each segment, fetch aggregated metrics
      const metricsPromises = segmentsData.map(async (segment) => {
        // Get lead IDs in this segment
        const { data: assignments } = await supabase
          .from('lead_segment_assignments')
          .select('lead_id')
          .eq('segment_id', segment.id);

        const leadIds = assignments?.map(a => a.lead_id) || [];
        
        if (leadIds.length === 0) {
          return {
            ...segment,
            lead_count: 0,
            avg_score: 0,
            total_value: 0,
            ouro_count: 0,
            prata_count: 0,
            bronze_count: 0,
            descartado_count: 0,
            last_lead_at: null
          } as SegmentMetrics;
        }

        // Get aggregated data
        const { data: leadsData } = await supabase
          .from('lead_master_pool')
          .select('global_score, total_value, lead_classification, created_at')
          .in('id', leadIds);

        const leads = leadsData || [];
        const avgScore = leads.length > 0 
          ? Math.round(leads.reduce((sum, l) => sum + (l.global_score || 0), 0) / leads.length)
          : 0;
        const totalValue = leads.reduce((sum, l) => sum + (l.total_value || 0), 0);
        
        const ouroCount = leads.filter(l => l.lead_classification === 'ouro').length;
        const prataCount = leads.filter(l => l.lead_classification === 'prata').length;
        const bronzeCount = leads.filter(l => l.lead_classification === 'bronze').length;
        const descartadoCount = leads.filter(l => l.lead_classification === 'descartado').length;
        
        const sortedLeads = [...leads].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastLeadAt = sortedLeads[0]?.created_at || null;

        return {
          ...segment,
          lead_count: leads.length,
          avg_score: avgScore,
          total_value: totalValue,
          ouro_count: ouroCount,
          prata_count: prataCount,
          bronze_count: bronzeCount,
          descartado_count: descartadoCount,
          last_lead_at: lastLeadAt
        } as SegmentMetrics;
      });

      return Promise.all(metricsPromises);
    },
    enabled: !!companyId
  });

  // Global stats
  const { data: globalStats } = useQuery({
    queryKey: ['lead-pool-global-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { count: totalLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const { data: valueData } = await supabase
        .from('lead_master_pool')
        .select('global_score, total_value, total_conversions')
        .eq('company_id', companyId);

      const totalValue = valueData?.reduce((sum, l) => sum + (l.total_value || 0), 0) || 0;
      const avgScore = valueData?.length 
        ? Math.round(valueData.reduce((sum, l) => sum + (l.global_score || 0), 0) / valueData.length)
        : 0;
      const convertedLeads = valueData?.filter(l => (l.total_conversions || 0) > 0).length || 0;

      return { totalLeads: totalLeads || 0, totalValue, avgScore, convertedLeads };
    },
    enabled: !!companyId
  });

  const getClassificationPercent = (segment: SegmentMetrics, classification: string) => {
    if (segment.lead_count === 0) return 0;
    const count = classification === 'ouro' ? segment.ouro_count 
      : classification === 'prata' ? segment.prata_count 
      : classification === 'bronze' ? segment.bronze_count 
      : segment.descartado_count;
    return Math.round((count / segment.lead_count) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Global Classification Stats */}
      <LeadClassificationStats />

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{globalStats?.totalLeads?.toLocaleString() || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold">{globalStats?.avgScore || 0}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidos</p>
                <p className="text-2xl font-bold">{globalStats?.convertedLeads?.toLocaleString() || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {globalStats?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Visão por Segmentos
          </CardTitle>
          <CardDescription>
            Métricas agregadas por segmento de leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : segments && segments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <Card key={segment.id} className="border-l-4" style={{ borderLeftColor: segment.color }}>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span>{segment.icon || '📁'}</span>
                            {segment.name}
                          </h3>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground mt-1">{segment.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {segment.lead_count}
                        </Badge>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Score Médio</p>
                          <p className="font-semibold text-lg">{segment.avg_score}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor Total</p>
                          <p className="font-semibold text-lg">
                            R$ {segment.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Classification Distribution */}
                      {segment.lead_count > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Distribuição por Classificação</p>
                          
                          <div className="space-y-1.5">
                            {/* Ouro */}
                            <div className="flex items-center gap-2">
                              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                              <div className="flex-1">
                                <Progress value={getClassificationPercent(segment, 'ouro')} className="h-2 bg-muted [&>div]:bg-yellow-500" />
                              </div>
                              <span className="text-xs w-14 text-right">{segment.ouro_count} ({getClassificationPercent(segment, 'ouro')}%)</span>
                            </div>
                            
                            {/* Prata */}
                            <div className="flex items-center gap-2">
                              <Medal className="h-3.5 w-3.5 text-slate-400" />
                              <div className="flex-1">
                                <Progress value={getClassificationPercent(segment, 'prata')} className="h-2 bg-muted [&>div]:bg-slate-400" />
                              </div>
                              <span className="text-xs w-14 text-right">{segment.prata_count} ({getClassificationPercent(segment, 'prata')}%)</span>
                            </div>
                            
                            {/* Bronze */}
                            <div className="flex items-center gap-2">
                              <Award className="h-3.5 w-3.5 text-amber-600" />
                              <div className="flex-1">
                                <Progress value={getClassificationPercent(segment, 'bronze')} className="h-2 bg-muted [&>div]:bg-amber-600" />
                              </div>
                              <span className="text-xs w-14 text-right">{segment.bronze_count} ({getClassificationPercent(segment, 'bronze')}%)</span>
                            </div>
                            
                            {/* Descartado */}
                            {segment.descartado_count > 0 && (
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                <div className="flex-1">
                                  <Progress value={getClassificationPercent(segment, 'descartado')} className="h-2 bg-muted [&>div]:bg-red-500" />
                                </div>
                                <span className="text-xs w-14 text-right">{segment.descartado_count} ({getClassificationPercent(segment, 'descartado')}%)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last activity */}
                      {segment.last_lead_at && (
                        <p className="text-xs text-muted-foreground">
                          Último lead: {new Date(segment.last_lead_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum segmento encontrado</p>
              <p className="text-sm">Crie segmentos na aba "Segmentos" para visualizar métricas agregadas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
