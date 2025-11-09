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

export function useCRMDashboardData(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-dashboard", workspaceId],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = subDays(currentMonthStart, 1);
      const thirtyDaysAgo = subDays(now, 30);

      // Buscar todos os leads do workspace
      const { data: allLeads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("*, crm_stages(name, color, order_index)")
        .eq("workspace_id", workspaceId);

      if (leadsError) throw leadsError;

      // Buscar estágios para identificar o último
      const { data: stages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (stagesError) throw stagesError;

      const lastStage = stages[stages.length - 1];

      // Separar leads por período
      const currentMonthLeads = allLeads?.filter(
        (lead) => new Date(lead.created_at) >= currentMonthStart
      ) || [];

      const lastMonthLeads = allLeads?.filter((lead) => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      }) || [];

      // Calcular métricas
      const totalLeads = allLeads?.length || 0;
      const totalLeadsChange = lastMonthLeads.length > 0
        ? ((currentMonthLeads.length - lastMonthLeads.length) / lastMonthLeads.length) * 100
        : 0;

      // Receita (soma do value dos leads do mês atual)
      const revenue = currentMonthLeads.reduce(
        (sum, lead) => sum + (typeof lead.value === 'number' ? lead.value : parseFloat(String(lead.value || 0))),
        0
      );

      const lastMonthRevenue = lastMonthLeads.reduce(
        (sum, lead) => sum + (typeof lead.value === 'number' ? lead.value : parseFloat(String(lead.value || 0))),
        0
      );

      const revenueChange = lastMonthRevenue > 0
        ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Taxa de conversão (leads no último estágio / total de leads)
      const leadsInLastStage = allLeads?.filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length || 0;

      const conversionRate = totalLeads > 0 ? (leadsInLastStage / totalLeads) * 100 : 0;

      const lastMonthTotal = lastMonthLeads.length;
      const lastMonthInLastStage = lastMonthLeads.filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length;
      const lastMonthConversionRate = lastMonthTotal > 0
        ? (lastMonthInLastStage / lastMonthTotal) * 100
        : 0;

      const conversionRateChange = lastMonthConversionRate > 0
        ? conversionRate - lastMonthConversionRate
        : 0;

      // Negócios fechados (leads no último estágio criados no mês atual)
      const closedDeals = currentMonthLeads.filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length;

      const closedDealsLastMonth = lastMonthLeads.filter(
        (lead) => lead.stage_id === lastStage?.id
      ).length;

      const closedDealsChange = closedDealsLastMonth > 0
        ? closedDeals - closedDealsLastMonth
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

      allLeads?.forEach((lead) => {
        if (lead.stage_id && leadsByStageMap.has(lead.stage_id)) {
          const stage = leadsByStageMap.get(lead.stage_id)!;
          stage.count++;
        }
      });

      const leadsByStage: LeadsByStage[] = Array.from(leadsByStageMap.values());

      // Leads ao longo do tempo (últimos 30 dias)
      const leadsInLast30Days = allLeads?.filter(
        (lead) => new Date(lead.created_at) >= thirtyDaysAgo
      ) || [];

      const leadsOverTimeMap = new Map<string, number>();
      
      // Inicializar todos os dias dos últimos 30 dias com 0
      for (let i = 0; i < 30; i++) {
        const date = subDays(now, 29 - i);
        const dateKey = date.toISOString().split("T")[0];
        leadsOverTimeMap.set(dateKey, 0);
      }

      // Contar leads por dia
      leadsInLast30Days.forEach((lead) => {
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

      // Buscar atividades recentes
      const { data: activities, error: activitiesError } = await supabase
        .from("crm_lead_activities")
        .select("*, crm_leads(full_name)")
        .in(
          "lead_id",
          allLeads?.map((l) => l.id) || []
        )
        .order("created_at", { ascending: false })
        .limit(4);

      if (activitiesError) throw activitiesError;

      const formattedActivities: Activity[] = activities?.map((activity) => ({
        id: activity.id,
        type: activity.activity_type,
        description: `${activity.activity_type} - ${(activity as any).crm_leads?.full_name || "Lead"}`,
        created_at: activity.created_at || "",
        lead_name: (activity as any).crm_leads?.full_name || "Lead",
      })) || [];

      // Leads recentes
      const { data: recentLeads, error: recentLeadsError } = await supabase
        .from("crm_leads")
        .select("id, full_name, email, created_at")
        .eq("workspace_id", workspaceId)
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
