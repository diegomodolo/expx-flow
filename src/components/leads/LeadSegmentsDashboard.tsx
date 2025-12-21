import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Trophy, Medal, Award, Trash2, RefreshCw } from "lucide-react";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { toast } from "sonner";

interface LeadSegmentsDashboardProps {
  companyId: string;
}

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

interface RecalculateProgress {
  segmentId: string;
  segmentName: string;
  total: number;
  processed: number;
}

// Helper to fetch ALL assignments (paginated to avoid 1000 limit)
async function fetchAllAssignments(segmentId: string): Promise<string[]> {
  const allLeadIds: string[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('lead_segment_assignments')
      .select('lead_id')
      .eq('segment_id', segmentId)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allLeadIds.push(...data.map(a => a.lead_id));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allLeadIds;
}

export const LeadSegmentsDashboard = ({ companyId }: LeadSegmentsDashboardProps) => {
  const queryClient = useQueryClient();
  const { scoreAndSaveLead } = useLeadScoring();
  const [recalculateProgressMap, setRecalculateProgressMap] = useState<Map<string, RecalculateProgress>>(new Map());

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
        // Get ALL lead IDs in this segment (paginated)
        const leadIds = await fetchAllAssignments(segment.id);
        
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

        // Get aggregated data (batch to avoid URL limits with large IN lists)
        const leads: Array<{ global_score: number | null; total_value: number | null; lead_classification: string | null; created_at: string }> = [];
        const chunkSize = 500;

        for (let i = 0; i < leadIds.length; i += chunkSize) {
          const chunkIds = leadIds.slice(i, i + chunkSize);
          const { data: chunkData, error } = await supabase
            .from('lead_master_pool')
            .select('global_score, total_value, lead_classification, created_at')
            .eq('company_id', companyId)
            .in('id', chunkIds);

          if (error) throw error;
          if (chunkData?.length) leads.push(...chunkData);
        }

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

  const handleRecalculateSegmentScores = async (segmentId: string, segmentName: string) => {
    // Check if already recalculating this segment
    if (recalculateProgressMap.has(segmentId)) {
      toast.info(`Segmento "${segmentName}" já está sendo recalculado.`);
      return;
    }

    try {
      // Fetch all lead IDs in this segment
      const leadIds = await fetchAllAssignments(segmentId);

      if (leadIds.length === 0) {
        toast.info(`Segmento "${segmentName}" não possui leads para recalcular.`);
        return;
      }

      // Initialize progress for this segment
      setRecalculateProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.set(segmentId, {
          segmentId,
          segmentName,
          total: leadIds.length,
          processed: 0
        });
        return newMap;
      });

      // Process in batches to avoid memory issues
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batchIds = leadIds.slice(i, i + batchSize);

        // Fetch lead data for this batch
        const { data: leadsData, error } = await supabase
          .from('lead_master_pool')
          .select('*')
          .in('id', batchIds);

        if (error) throw error;

        // Score each lead
        for (const lead of leadsData || []) {
          await scoreAndSaveLead(lead.id, lead);
          processed++;
          
          // Update progress every 10 leads to avoid too many re-renders
          if (processed % 10 === 0 || processed === leadIds.length) {
            const currentProcessed = processed;
            setRecalculateProgressMap(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(segmentId);
              if (existing) {
                newMap.set(segmentId, { ...existing, processed: currentProcessed });
              }
              return newMap;
            });
          }
        }
      }

      toast.success(`${processed} leads do segmento "${segmentName}" recalculados!`);
      queryClient.invalidateQueries({ queryKey: ['lead-segments-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
    } catch (error) {
      console.error('Error recalculating segment scores:', error);
      toast.error(`Erro ao recalcular scores do segmento "${segmentName}"`);
    } finally {
      // Remove this segment from progress map
      setRecalculateProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(segmentId);
        return newMap;
      });
    }
  };

  return (
    <div className="space-y-6">
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
          {/* Progress cards when recalculating (supports multiple in parallel) */}
          {recalculateProgressMap.size > 0 && (
            <div className="mb-6 space-y-3">
              {Array.from(recalculateProgressMap.values()).map((progress) => (
                <div 
                  key={progress.segmentId} 
                  className="p-4 border rounded-lg bg-muted/50 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Recalculando scores: {progress.segmentName}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {progress.processed} / {progress.total}
                    </span>
                  </div>
                  <Progress 
                    value={(progress.processed / progress.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((progress.processed / progress.total) * 100)}% concluído
                  </p>
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : segments && segments.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segmento</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Score médio</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                    <TableHead className="text-right">Ouro</TableHead>
                    <TableHead className="text-right">Prata</TableHead>
                    <TableHead className="text-right">Bronze</TableHead>
                    <TableHead className="text-right">Descartado</TableHead>
                    <TableHead className="text-right">Último lead</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: segment.color }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span aria-hidden="true">{segment.icon === 'tag' ? '🏷️' : (segment.icon || '📁')}</span>
                              <span className="truncate">{segment.name}</span>
                            </div>
                            {segment.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {segment.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="secondary" className="tabular-nums">
                          {segment.lead_count}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{segment.avg_score}</TableCell>

                      <TableCell className="text-right tabular-nums">
                        R$ {segment.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          {segment.ouro_count}
                        </span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Medal className="h-3.5 w-3.5 text-slate-400" />
                          {segment.prata_count}
                        </span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Award className="h-3.5 w-3.5 text-amber-600" />
                          {segment.bronze_count}
                        </span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          {segment.descartado_count}
                        </span>
                      </TableCell>

                      <TableCell className="text-right text-sm text-muted-foreground">
                        {segment.last_lead_at ? new Date(segment.last_lead_at).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecalculateSegmentScores(segment.id, segment.name)}
                          disabled={recalculateProgressMap.has(segment.id)}
                          title="Recalcular scores deste segmento"
                        >
                          <RefreshCw className={`h-4 w-4 ${recalculateProgressMap.has(segment.id) ? 'animate-spin' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
