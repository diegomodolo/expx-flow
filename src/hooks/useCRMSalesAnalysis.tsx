import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SalesMetrics {
  totalRevenue: number;
  revenueChange: number;
  averageTicket: number;
  closingRate: number;
  totalDeals: number;
  dealsChange: number;
  revenueBySource: Array<{ source: string; revenue: number; deals: number }>;
  projectedRevenue: number;
}

export function useCRMSalesAnalysis(workspaceId: string, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["crm-sales-analysis", workspaceId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<SalesMetrics> => {
      // Calcular período de comparação
      const filterDuration = endDate.getTime() - startDate.getTime();
      const comparisonEnd = new Date(startDate.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - filterDuration);

      // Buscar estágios para identificar o último
      const { data: stages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (stagesError) throw stagesError;

      const lastStage = stages[stages.length - 1];

      // Buscar leads do período atual
      const { data: currentLeads, error: currentLeadsError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (currentLeadsError) throw currentLeadsError;

      // Buscar leads do período de comparação
      const { data: comparisonLeads, error: comparisonLeadsError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", comparisonStart.toISOString())
        .lte("created_at", comparisonEnd.toISOString());

      if (comparisonLeadsError) throw comparisonLeadsError;

      // Calcular receita total (apenas leads no último estágio)
      const closedDeals = currentLeads?.filter(l => l.stage_id === lastStage?.id) || [];
      const totalRevenue = closedDeals.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);

      const comparisonClosedDeals = comparisonLeads?.filter(l => l.stage_id === lastStage?.id) || [];
      const comparisonRevenue = comparisonClosedDeals.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);

      const revenueChange = comparisonRevenue > 0
        ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;

      // Ticket médio
      const averageTicket = closedDeals.length > 0
        ? totalRevenue / closedDeals.length
        : 0;

      // Taxa de fechamento
      const totalLeads = currentLeads?.length || 0;
      const closingRate = totalLeads > 0
        ? (closedDeals.length / totalLeads) * 100
        : 0;

      // Mudança em negócios fechados
      const dealsChange = comparisonClosedDeals.length > 0
        ? closedDeals.length - comparisonClosedDeals.length
        : closedDeals.length;

      // Receita por fonte
      const revenueBySourceMap = new Map<string, { revenue: number; deals: number }>();
      
      closedDeals.forEach(lead => {
        const source = lead.utm_source || 'Direto';
        const current = revenueBySourceMap.get(source) || { revenue: 0, deals: 0 };
        revenueBySourceMap.set(source, {
          revenue: current.revenue + (Number(lead.value) || 0),
          deals: current.deals + 1
        });
      });

      const revenueBySource = Array.from(revenueBySourceMap.entries())
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Receita projetada (baseada em todos os leads com valor no pipeline)
      const projectedRevenue = currentLeads?.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0) || 0;

      return {
        totalRevenue,
        revenueChange: Math.round(revenueChange * 10) / 10,
        averageTicket,
        closingRate: Math.round(closingRate * 10) / 10,
        totalDeals: closedDeals.length,
        dealsChange,
        revenueBySource,
        projectedRevenue
      };
    },
    enabled: !!workspaceId
  });
}
