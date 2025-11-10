import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SourcePerformance {
  source: string;
  campaign: string;
  medium: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
  temperatureDistribution: {
    quente: number;
    morno: number;
    frio: number;
  };
}

interface SourcesMetrics {
  sourcePerformance: SourcePerformance[];
  bestSource: {
    name: string;
    conversionRate: number;
    revenue: number;
  } | null;
  bestCampaign: {
    name: string;
    conversionRate: number;
    leads: number;
  } | null;
  totalSources: number;
}

export function useCRMSourcesAnalysis(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  groupBy: "source" | "campaign" | "medium" = "source"
) {
  return useQuery({
    queryKey: ["crm-sources-analysis", workspaceId, startDate, endDate, groupBy],
    queryFn: async (): Promise<SourcesMetrics> => {
      const { data: leads, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      // Agrupar leads por fonte/campanha/meio
      const sourceMap: Record<string, {
        source: string;
        campaign: string;
        medium: string;
        leads: any[];
      }> = {};

      leads?.forEach((lead) => {
        const source = lead.utm_source || "Direto";
        const campaign = lead.utm_campaign || "N/A";
        const medium = lead.utm_media || "N/A";
        
        let key: string;
        if (groupBy === "source") {
          key = source;
        } else if (groupBy === "campaign") {
          key = campaign;
        } else {
          key = medium;
        }

        if (!sourceMap[key]) {
          sourceMap[key] = {
            source,
            campaign,
            medium,
            leads: [],
          };
        }
        sourceMap[key].leads.push(lead);
      });

      // Calcular métricas para cada fonte
      const sourcePerformance: SourcePerformance[] = Object.entries(sourceMap).map(
        ([key, data]) => {
          const totalLeads = data.leads.length;
          const convertedLeads = data.leads.filter((l) => l.status === "won").length;
          const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
          const totalRevenue = data.leads
            .filter((l) => l.status === "won")
            .reduce((sum, l) => sum + (l.value || 0), 0);
          const averageTicket = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

          const temperatureDistribution = {
            quente: data.leads.filter((l) => l.temperature === "quente").length,
            morno: data.leads.filter((l) => l.temperature === "morno").length,
            frio: data.leads.filter((l) => l.temperature === "frio").length,
          };

          return {
            source: data.source,
            campaign: data.campaign,
            medium: data.medium,
            totalLeads,
            convertedLeads,
            conversionRate,
            totalRevenue,
            averageTicket,
            temperatureDistribution,
          };
        }
      ).sort((a, b) => b.conversionRate - a.conversionRate);

      // Identificar melhor fonte
      const bestSource = sourcePerformance.length > 0
        ? {
            name: sourcePerformance[0].source,
            conversionRate: sourcePerformance[0].conversionRate,
            revenue: sourcePerformance[0].totalRevenue,
          }
        : null;

      // Identificar melhor campanha (por número de leads convertidos)
      const campaignPerformance = [...sourcePerformance].sort(
        (a, b) => b.convertedLeads - a.convertedLeads
      );
      const bestCampaign = campaignPerformance.length > 0
        ? {
            name: campaignPerformance[0].campaign,
            conversionRate: campaignPerformance[0].conversionRate,
            leads: campaignPerformance[0].convertedLeads,
          }
        : null;

      return {
        sourcePerformance,
        bestSource,
        bestCampaign,
        totalSources: sourcePerformance.length,
      };
    },
    enabled: !!workspaceId,
  });
}
