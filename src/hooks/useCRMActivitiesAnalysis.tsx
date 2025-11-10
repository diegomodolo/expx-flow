import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, differenceInDays } from "date-fns";

interface ActivitiesMetrics {
  totalActivities: number;
  activitiesByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  inactiveLeads: Array<{
    leadId: string;
    leadName: string;
    email: string;
    daysSinceLastActivity: number;
    stage: string;
  }>;
  avgTimeBetweenActivities: number;
  mostActiveLeads: Array<{
    leadId: string;
    leadName: string;
    activitiesCount: number;
  }>;
  activitiesOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export function useCRMActivitiesAnalysis(
  workspaceId: string,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ["crm-activities-analysis", workspaceId, startDate, endDate],
    queryFn: async (): Promise<ActivitiesMetrics> => {
      // Buscar todas as atividades do período
      const { data: activities, error: activitiesError } = await supabase
        .from("crm_lead_activities")
        .select(`
          *,
          crm_leads!inner(id, name, email, workspace_id, crm_stages(name))
        `)
        .eq("crm_leads.workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (activitiesError) throw activitiesError;

      const totalActivities = activities?.length || 0;

      // Atividades por tipo
      const typeCount: Record<string, number> = {};
      activities?.forEach((activity) => {
        typeCount[activity.activity_type] = (typeCount[activity.activity_type] || 0) + 1;
      });

      const activitiesByType = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count,
        percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0,
      }));

      // Atividades ao longo do tempo (agrupadas por dia)
      const activitiesByDate: Record<string, number> = {};
      activities?.forEach((activity) => {
        const date = format(new Date(activity.created_at!), "yyyy-MM-dd");
        activitiesByDate[date] = (activitiesByDate[date] || 0) + 1;
      });

      const activitiesOverTime = Object.entries(activitiesByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Buscar todos os leads do workspace para identificar inativos
      const { data: allLeads, error: leadsError } = await supabase
        .from("crm_leads")
        .select(`
          id,
          full_name,
          email,
          created_at,
          stage_id,
          crm_stages(name)
        `)
        .eq("workspace_id", workspaceId);

      if (leadsError) throw leadsError;

      // Buscar última atividade de cada lead
      const { data: lastActivities, error: lastActivitiesError } = await supabase
        .from("crm_lead_activities")
        .select("lead_id, created_at")
        .in("lead_id", allLeads?.map(l => l.id) || [])
        .order("created_at", { ascending: false });

      if (lastActivitiesError) throw lastActivitiesError;

      const lastActivityByLead: Record<string, Date> = {};
      lastActivities?.forEach((activity) => {
        if (!lastActivityByLead[activity.lead_id]) {
          lastActivityByLead[activity.lead_id] = new Date(activity.created_at!);
        }
      });

      // Identificar leads inativos
      const now = new Date();
      const inactiveLeads = allLeads
        ?.map((lead) => {
          const lastActivity = lastActivityByLead[lead.id];
          const daysSinceLastActivity = lastActivity
            ? differenceInDays(now, lastActivity)
            : differenceInDays(now, new Date(lead.created_at!));

          return {
            leadId: lead.id,
            leadName: lead.full_name || "Sem nome",
            email: lead.email || "",
            daysSinceLastActivity,
            stage: (lead.crm_stages as any)?.name || "N/A",
          };
        })
        .filter((lead) => lead.daysSinceLastActivity >= 7)
        .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity) || [];

      // Calcular tempo médio entre atividades
      let totalTimeDiffs = 0;
      let diffCount = 0;
      
      const leadActivitiesSorted = [...(activities || [])].sort((a, b) => 
        new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
      );

      const activitiesByLeadId: Record<string, any[]> = {};
      leadActivitiesSorted.forEach(activity => {
        const leadId = (activity.crm_leads as any).id;
        if (!activitiesByLeadId[leadId]) activitiesByLeadId[leadId] = [];
        activitiesByLeadId[leadId].push(activity);
      });

      Object.values(activitiesByLeadId).forEach(leadActivities => {
        for (let i = 1; i < leadActivities.length; i++) {
          const diff = differenceInDays(
            new Date(leadActivities[i].created_at!),
            new Date(leadActivities[i - 1].created_at!)
          );
          totalTimeDiffs += diff;
          diffCount++;
        }
      });

      const avgTimeBetweenActivities = diffCount > 0 ? totalTimeDiffs / diffCount : 0;

      // Leads mais ativos
      const leadActivityCount: Record<string, { name: string; count: number }> = {};
      activities?.forEach((activity) => {
        const lead = activity.crm_leads as any;
        const leadName = lead.full_name || lead.email || "Sem nome";
        if (!leadActivityCount[lead.id]) {
          leadActivityCount[lead.id] = { name: leadName, count: 0 };
        }
        leadActivityCount[lead.id].count++;
      });

      const mostActiveLeads = Object.entries(leadActivityCount)
        .map(([leadId, data]) => ({
          leadId,
          leadName: data.name,
          activitiesCount: data.count,
        }))
        .sort((a, b) => b.activitiesCount - a.activitiesCount)
        .slice(0, 5);

      return {
        totalActivities,
        activitiesByType,
        inactiveLeads,
        avgTimeBetweenActivities,
        mostActiveLeads,
        activitiesOverTime,
      };
    },
    enabled: !!workspaceId,
  });
}
