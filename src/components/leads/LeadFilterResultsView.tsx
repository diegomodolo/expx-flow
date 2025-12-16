import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ArrowLeft, Users, TrendingUp, Trophy, Medal, Award, Trash2, MapPin, Building, RefreshCw } from "lucide-react";

interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  filter_config: {
    conditions: FilterCondition[];
    logic: 'AND' | 'OR';
  };
}

interface FilterResults {
  totalLeads: number;
  avgScore: number;
  medianScore: number;
  totalValue: number;
  avgValue: number;
  ouroCount: number;
  prataCount: number;
  bronzeCount: number;
  descartadoCount: number;
  topStates: { state: string; count: number }[];
  topSegments: { segment: string; count: number }[];
}

interface Props {
  filter: SavedFilter;
  onBack: () => void;
}

export const LeadFilterResultsView = ({ filter, onBack }: Props) => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: results, isLoading } = useQuery({
    queryKey: ['filter-results', filter.id, companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Build filter string for RPC or just fetch all and filter in memory for now
      // This is a simpler approach that avoids complex type issues
      const { data: allLeads, error } = await supabase
        .from('lead_master_pool')
        .select('global_score, total_value, lead_classification, state, company_segment')
        .eq('company_id', companyId);

      if (error) throw error;
      if (!allLeads) return null;

      // Apply filter conditions in memory
      const leads = allLeads.filter(lead => {
        const results = filter.filter_config.conditions.map(condition => {
          const { field, operator, value } = condition;
          const leadValue = (lead as Record<string, unknown>)[field];

          switch (operator) {
            case 'equals':
              return leadValue === value;
            case 'not_equals':
              return leadValue !== value;
            case 'contains':
              return typeof leadValue === 'string' && leadValue.toLowerCase().includes(String(value).toLowerCase());
            case 'not_contains':
              return typeof leadValue === 'string' && !leadValue.toLowerCase().includes(String(value).toLowerCase());
            case 'starts_with':
              return typeof leadValue === 'string' && leadValue.toLowerCase().startsWith(String(value).toLowerCase());
            case 'greater_than':
              return typeof leadValue === 'number' && leadValue > Number(value);
            case 'less_than':
              return typeof leadValue === 'number' && leadValue < Number(value);
            case 'greater_or_equal':
              return typeof leadValue === 'number' && leadValue >= Number(value);
            case 'less_or_equal':
              return typeof leadValue === 'number' && leadValue <= Number(value);
            case 'is_null':
              return leadValue === null || leadValue === undefined;
            case 'is_not_null':
              return leadValue !== null && leadValue !== undefined;
            case 'in':
              return Array.isArray(value) && value.includes(leadValue);
            default:
              return true;
          }
        });

        return filter.filter_config.logic === 'AND' 
          ? results.every(r => r) 
          : results.some(r => r);
      });
      if (error) throw error;
      if (!leads || leads.length === 0) {
        return {
          totalLeads: 0,
          avgScore: 0,
          medianScore: 0,
          totalValue: 0,
          avgValue: 0,
          ouroCount: 0,
          prataCount: 0,
          bronzeCount: 0,
          descartadoCount: 0,
          topStates: [],
          topSegments: []
        } as FilterResults;
      }

      // Calculate aggregated metrics
      const scores = leads.map(l => l.global_score || 0).sort((a, b) => a - b);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const medianScore = scores[Math.floor(scores.length / 2)];
      
      const totalValue = leads.reduce((sum, l) => sum + (l.total_value || 0), 0);
      const avgValue = Math.round(totalValue / leads.length);

      const ouroCount = leads.filter(l => l.lead_classification === 'ouro').length;
      const prataCount = leads.filter(l => l.lead_classification === 'prata').length;
      const bronzeCount = leads.filter(l => l.lead_classification === 'bronze').length;
      const descartadoCount = leads.filter(l => l.lead_classification === 'descartado').length;

      // Top states
      const stateCounts: Record<string, number> = {};
      leads.forEach(l => {
        if (l.state) {
          stateCounts[l.state] = (stateCounts[l.state] || 0) + 1;
        }
      });
      const topStates = Object.entries(stateCounts)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top segments
      const segmentCounts: Record<string, number> = {};
      leads.forEach(l => {
        if (l.company_segment) {
          segmentCounts[l.company_segment] = (segmentCounts[l.company_segment] || 0) + 1;
        }
      });
      const topSegments = Object.entries(segmentCounts)
        .map(([segment, count]) => ({ segment, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalLeads: leads.length,
        avgScore,
        medianScore,
        totalValue,
        avgValue,
        ouroCount,
        prataCount,
        bronzeCount,
        descartadoCount,
        topStates,
        topSegments
      } as FilterResults;
    },
    enabled: !!companyId && !!filter
  });

  const getClassificationPercent = (count: number) => {
    if (!results || results.totalLeads === 0) return 0;
    return Math.round((count / results.totalLeads) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{filter.name}</h2>
          {filter.description && (
            <p className="text-sm text-muted-foreground">{filter.description}</p>
          )}
        </div>
      </div>

      {/* Filter conditions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Condições Aplicadas</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {filter.filter_config.conditions.map((c, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {c.field} {c.operator} {c.value?.toString()}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-xs">
              Lógica: {filter.filter_config.logic}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : results && results.totalLeads > 0 ? (
        <>
          {/* Main metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Leads</p>
                    <p className="text-2xl font-bold">{results.totalLeads.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Score Médio / Mediana</p>
                  <p className="text-2xl font-bold">{results.avgScore} / {results.medianScore}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">R$ {results.totalValue.toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">R$ {results.avgValue.toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Classification distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição por Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="w-20 text-sm">Ouro</span>
                  <div className="flex-1">
                    <Progress value={getClassificationPercent(results.ouroCount)} className="h-2 [&>div]:bg-yellow-500" />
                  </div>
                  <span className="text-sm w-16 text-right">{results.ouroCount} ({getClassificationPercent(results.ouroCount)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-slate-400" />
                  <span className="w-20 text-sm">Prata</span>
                  <div className="flex-1">
                    <Progress value={getClassificationPercent(results.prataCount)} className="h-2 [&>div]:bg-slate-400" />
                  </div>
                  <span className="text-sm w-16 text-right">{results.prataCount} ({getClassificationPercent(results.prataCount)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  <span className="w-20 text-sm">Bronze</span>
                  <div className="flex-1">
                    <Progress value={getClassificationPercent(results.bronzeCount)} className="h-2 [&>div]:bg-amber-600" />
                  </div>
                  <span className="text-sm w-16 text-right">{results.bronzeCount} ({getClassificationPercent(results.bronzeCount)}%)</span>
                </div>
                {results.descartadoCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="w-20 text-sm">Descartado</span>
                    <div className="flex-1">
                      <Progress value={getClassificationPercent(results.descartadoCount)} className="h-2 [&>div]:bg-red-500" />
                    </div>
                    <span className="text-sm w-16 text-right">{results.descartadoCount} ({getClassificationPercent(results.descartadoCount)}%)</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top states */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Top 5 Estados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.topStates.length > 0 ? (
                  <div className="space-y-2">
                    {results.topStates.map((item, idx) => (
                      <div key={item.state} className="flex items-center justify-between">
                        <span className="text-sm">{idx + 1}. {item.state}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados de estado</p>
                )}
              </CardContent>
            </Card>

            {/* Top segments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Top 5 Segmentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.topSegments.length > 0 ? (
                  <div className="space-y-2">
                    {results.topSegments.map((item, idx) => (
                      <div key={item.segment} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[150px]">{idx + 1}. {item.segment}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados de segmento</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export action */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Exportar para Audiences</h3>
                  <p className="text-sm text-muted-foreground">
                    Exporte os leads deste filtro para públicos do Meta ou Google Ads
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Em breve
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum lead encontrado com este filtro</p>
              <p className="text-sm mt-1">Ajuste as condições do filtro para obter resultados</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
