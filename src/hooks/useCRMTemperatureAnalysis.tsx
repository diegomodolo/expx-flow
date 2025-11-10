import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

interface TemperatureDistribution {
  quente: { count: number; percentage: number; revenue: number };
  morno: { count: number; percentage: number; revenue: number };
  frio: { count: number; percentage: number; revenue: number };
  undefined: { count: number; percentage: number; revenue: number };
}

interface ConversionByTemperature {
  temperature: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgConversionTime: number;
}

interface TemperatureMetrics {
  distribution: TemperatureDistribution;
  conversionByTemperature: ConversionByTemperature[];
  hotLeadsWithoutActivity: Array<{
    leadId: string;
    leadName: string;
    value: number;
    daysSinceLastActivity: number;
    email: string;
  }>;
  coldLeadsWithHighValue: Array<{
    leadId: string;
    leadName: string;
    value: number;
    stage: string;
    email: string;
  }>;
}

export function useCRMTemperatureAnalysis(
  workspaceId: string,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ["crm-temperature-analysis", workspaceId, startDate, endDate],
    queryFn: async (): Promise<TemperatureMetrics> => {
      // Buscar todos os leads do período
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select(`
          *,
          crm_stages(name)
        `)
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (leadsError) throw leadsError;

      const totalLeads = leads?.length || 0;

      // Distribuição por temperatura
      const distribution: TemperatureDistribution = {
        quente: { count: 0, percentage: 0, revenue: 0 },
        morno: { count: 0, percentage: 0, revenue: 0 },
        frio: { count: 0, percentage: 0, revenue: 0 },
        undefined: { count: 0, percentage: 0, revenue: 0 },
      };

      leads?.forEach((lead) => {
        const temp = lead.temperature || "undefined";
        const key = temp as keyof TemperatureDistribution;
        
        if (distribution[key]) {
          distribution[key].count++;
          if (lead.status === "won") {
            distribution[key].revenue += lead.value || 0;
          }
        }
      });

      // Calcular percentagens
      Object.keys(distribution).forEach((key) => {
        const k = key as keyof TemperatureDistribution;
        distribution[k].percentage = totalLeads > 0 
          ? (distribution[k].count / totalLeads) * 100 
          : 0;
      });

      // Conversão por temperatura
      const tempGroups = ["quente", "morno", "frio", "undefined"];
      const conversionByTemperature: ConversionByTemperature[] = tempGroups.map((temp) => {
        const tempLeads = leads?.filter((l) => 
          temp === "undefined" ? !l.temperature : l.temperature === temp
        ) || [];
        
        const totalLeads = tempLeads.length;
        const convertedLeads = tempLeads.filter((l) => l.status === "won").length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        // Calcular tempo médio de conversão (usando created_at e updated_at como proxy)
        const convertedTimes = tempLeads
          .filter((l) => l.status === "won")
          .map((l) => differenceInDays(new Date(l.updated_at || l.created_at!), new Date(l.created_at!)));
        
        const avgConversionTime = convertedTimes.length > 0
          ? convertedTimes.reduce((sum, days) => sum + days, 0) / convertedTimes.length
          : 0;

        return {
          temperature: temp === "undefined" ? "Não definida" : temp.charAt(0).toUpperCase() + temp.slice(1),
          totalLeads,
          convertedLeads,
          conversionRate,
          avgConversionTime,
        };
      });

      // Buscar última atividade de cada lead
      const leadIds = leads?.map(l => l.id) || [];
      const { data: lastActivities } = await supabase
        .from("crm_lead_activities")
        .select("lead_id, created_at")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      const lastActivityByLead: Record<string, Date> = {};
      lastActivities?.forEach((activity) => {
        if (!lastActivityByLead[activity.lead_id]) {
          lastActivityByLead[activity.lead_id] = new Date(activity.created_at!);
        }
      });

      // Leads quentes sem atividade
      const now = new Date();
      const hotLeadsWithoutActivity = leads
        ?.filter((l) => l.temperature === "quente" && l.status !== "won" && l.status !== "lost")
        .map((lead) => {
          const lastActivity = lastActivityByLead[lead.id];
          const daysSinceLastActivity = lastActivity
            ? differenceInDays(now, lastActivity)
            : differenceInDays(now, new Date(lead.created_at!));

          return {
            leadId: lead.id,
            leadName: lead.full_name || lead.email || "Sem nome",
            value: lead.value || 0,
            daysSinceLastActivity,
            email: lead.email || "",
          };
        })
        .filter((l) => l.daysSinceLastActivity >= 7)
        .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
        .slice(0, 10) || [];

      // Leads frios com alto valor (acima da média)
      const avgValue = leads && leads.length > 0
        ? leads.reduce((sum, l) => sum + (l.value || 0), 0) / leads.length
        : 0;

      const coldLeadsWithHighValue = leads
        ?.filter((l) => l.temperature === "frio" && (l.value || 0) > avgValue && l.status !== "won" && l.status !== "lost")
        .map((lead) => ({
          leadId: lead.id,
          leadName: lead.full_name || lead.email || "Sem nome",
          value: lead.value || 0,
          stage: (lead.crm_stages as any)?.name || "N/A",
          email: lead.email || "",
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) || [];

      return {
        distribution,
        conversionByTemperature,
        hotLeadsWithoutActivity,
        coldLeadsWithHighValue,
      };
    },
    enabled: !!workspaceId,
  });
}
