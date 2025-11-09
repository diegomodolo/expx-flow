import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, subDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DashboardMetrics {
  totalLeads: number;
  totalLeadsChange: number;
  revenue: number;
  revenueChange: number;
  conversionRate: number;
  conversionRateChange: number;
  closedDeals: number;
  closedDealsChange: number;
}

export interface LeadsByStage {
  name: string;
  count: number;
  color: string;
}

export interface LeadsOverTime {
  date: string;
  count: number;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  lead_name: string;
}

export interface RecentLead {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export function useCRMDashboardData(workspaceId: string, filterStartDate?: Date, filterEndDate?: Date) {
  return useQuery({
    queryKey: ["crm-dashboard", workspaceId, filterStartDate?.toISOString(), filterEndDate?.toISOString()],
    queryFn: async () => {
      const now = filterEndDate || new Date();
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = subDays(currentMonthStart, 1);
      
      // Usar as datas de filtro se fornecidas, caso contrário usar últimos 30 dias
      const filterStart = filterStartDate || subDays(now, 30);
      const filterEnd = filterEndDate || now;

      // Buscar todos os leads do workspace
      const { data: allLeads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("*, crm_stages(name, color, order_index)")
        .eq("workspace_id", workspaceId)
        .gte("created_at", filterStart.toISOString())
        .lte("created_at", filterEnd.toISOString());

      if (leadsError) throw leadsError;

      // Buscar estágios para identificar o último
      const { data: stages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (stagesError) throw stagesError;

      const lastStage = stages[stages.length - 1];

      // Separar leads por período (filtrado)
      const filteredLeads = allLeads || [];
      
      // Calcular período de comparação (mesmo tamanho do filtro, mas anterior)
      const filterDuration = filterEnd.getTime() - filterStart.getTime();
      const comparisonEnd = new Date(filterStart.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - filterDuration);

      // Buscar leads do período de comparação
      const { data: comparisonLeads } = await supabase
        .from("crm_leads")
        .select("*, crm_stages(name, color, order_index)")
        .eq("workspace_id", workspaceId)
        .gte("created_at", comparisonStart.toISOString())
        .lte("created_at", comparisonEnd.toISOString());

      // Calcular métricas
      const totalLeads = filteredLeads.length;
      const comparisonTotalLeads = comparisonLeads?.length || 0;
      const totalLeadsChange = comparisonTotalLeads > 0
        ? ((totalLeads - comparisonTotalLeads) / comparisonTotalLeads) * 100
        : 0;

      // Receita (soma do value dos leads do período filtrado)
      const revenue = filteredLeads.reduce(
        (sum, lead) => sum + (typeof lead.value === 'number' ? lead.value : parseFloat(String(lead.value || 0))),
        0
      );

      const comparisonRevenue = (comparisonLeads || []).reduce(
        (sum, lead) => sum + (typeof lead.value === 'number' ? lead.value : parseFloat(String(lead.value || 0))),
        0
      );

      const revenueChange = comparisonRevenue > 0
        ? ((revenue - comparisonRevenue) / comparisonRevenue) * 100
        : 0;

      // Taxa de conversão (leads no último estágio / total de leads)
      const leadsInLastStage = filteredLeads.filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length;

      const conversionRate = totalLeads > 0 ? (leadsInLastStage / totalLeads) * 100 : 0;

      const comparisonInLastStage = (comparisonLeads || []).filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length;
      const comparisonConversionRate = comparisonTotalLeads > 0
        ? (comparisonInLastStage / comparisonTotalLeads) * 100
        : 0;

      const conversionRateChange = comparisonConversionRate > 0
        ? conversionRate - comparisonConversionRate
        : 0;

      // Negócios fechados (leads no último estágio no período filtrado)
      const closedDeals = leadsInLastStage;

      const closedDealsComparison = comparisonInLastStage;

      const closedDealsChange = closedDealsComparison > 0
        ? closedDeals - closedDealsComparison
        : closedDeals;

      // Leads por estágio
      const leadsByStageMap = new Map<string, { name: string; count: number; color: string }>();
      
      stages.forEach((stage) => {
        leadsByStageMap.set(stage.id, {
          name: stage.name,
          count: 0,
          color: stage.color || "#137fec",
        });
      });

      filteredLeads.forEach((lead) => {
        if (lead.stage_id && leadsByStageMap.has(lead.stage_id)) {
          const stage = leadsByStageMap.get(lead.stage_id)!;
          stage.count++;
        }
      });

      const leadsByStage: LeadsByStage[] = Array.from(leadsByStageMap.values());

      // Leads ao longo do tempo (período filtrado)
      const leadsOverTimeMap = new Map<string, number>();
      
      // Inicializar todos os dias do período filtrado com 0
      const daysDiff = Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(filterStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];
        leadsOverTimeMap.set(dateKey, 0);
      }

      // Contar leads por dia
      filteredLeads.forEach((lead) => {
        const dateKey = new Date(lead.created_at).toISOString().split("T")[0];
        if (leadsOverTimeMap.has(dateKey)) {
          leadsOverTimeMap.set(dateKey, leadsOverTimeMap.get(dateKey)! + 1);
        }
      });

      const leadsOverTime: LeadsOverTime[] = Array.from(leadsOverTimeMap.entries()).map(
        ([date, count]) => ({
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          count,
        })
      );

      // Buscar atividades recentes (do período filtrado)
      let activities = [];
      if (filteredLeads.length > 0) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from("crm_lead_activities")
          .select("*, crm_leads(full_name)")
          .in(
            "lead_id",
            filteredLeads.map((l) => l.id)
          )
          .order("created_at", { ascending: false })
          .limit(4);

        if (activitiesError) throw activitiesError;
        activities = activitiesData || [];
      }

      const formattedActivities: Activity[] = activities.map((activity) => ({
        id: activity.id,
        type: activity.activity_type,
        description: `${activity.activity_type} - ${(activity as any).crm_leads?.full_name || "Lead"}`,
        created_at: activity.created_at || "",
        lead_name: (activity as any).crm_leads?.full_name || "Lead",
      }));

      // Leads recentes (do período filtrado)
      const { data: recentLeads, error: recentLeadsError } = await supabase
        .from("crm_leads")
        .select("id, full_name, email, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", filterStart.toISOString())
        .lte("created_at", filterEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(4);

      if (recentLeadsError) throw recentLeadsError;

      const metrics: DashboardMetrics = {
        totalLeads,
        totalLeadsChange: Math.round(totalLeadsChange * 10) / 10,
        revenue,
        revenueChange: Math.round(revenueChange * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        conversionRateChange: Math.round(conversionRateChange * 10) / 10,
        closedDeals,
        closedDealsChange,
      };

      return {
        metrics,
        leadsByStage,
        leadsOverTime,
        activities: formattedActivities,
        recentLeads: recentLeads || [],
      };
    },
    enabled: !!workspaceId,
  });
}

export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
