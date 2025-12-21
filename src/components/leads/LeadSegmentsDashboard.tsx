import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Trophy, Medal, Award, Trash2 } from "lucide-react";

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

export const LeadSegmentsDashboard = ({ companyId }: LeadSegmentsDashboardProps) => {

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
