import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, subDays } from "date-fns";
import { calculatePercentageChange } from "@/lib/crmReportUtils";

interface ExecutiveMetrics {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalLeads: number;
    convertedLeads: number;
    totalRevenue: number;
    avgTicket: number;
    conversionRate: number;
    avgConversionTime: number;
    pipelineValue: number;
  };
  comparison: {
    leadsChange: number;
    revenueChange: number;
    conversionRateChange: number;
  };
  topInsights: Array<{
    type: "success" | "warning" | "info";
    title: string;
    description: string;
    metric?: string;
  }>;
  topSources: Array<{
    name: string;
    revenue: number;
    leads: number;
  }>;
}

export function useCRMExecutiveReport(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  compareWithPrevious: boolean = false
) {
  return useQuery({
    queryKey: ["crm-executive-report", workspaceId, startDate, endDate, compareWithPrevious],
    queryFn: async (): Promise<ExecutiveMetrics> => {
      // Período atual
      const { data: currentLeads, error: currentError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (currentError) throw currentError;

      // Calcular métricas do período atual
      const totalLeads = currentLeads?.length || 0;
      const convertedLeads = currentLeads?.filter((l) => l.status === "won").length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const totalRevenue = currentLeads
        ?.filter((l) => l.status === "won")
        .reduce((sum, l) => sum + (l.value || 0), 0) || 0;
      const avgTicket = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

      // Calcular tempo médio de conversão (usando updated_at como proxy de won_at)
      const conversionTimes = currentLeads
        ?.filter((l) => l.status === "won")
        .map((l) => differenceInDays(new Date(l.updated_at || l.created_at!), new Date(l.created_at!))) || [];
      const avgConversionTime = conversionTimes.length > 0
        ? conversionTimes.reduce((sum, days) => sum + days, 0) / conversionTimes.length
        : 0;

      // Valor no pipeline (leads não ganhos e não perdidos)
      const pipelineValue = currentLeads
        ?.filter((l) => l.status !== "won" && l.status !== "lost")
        .reduce((sum, l) => sum + (l.value || 0), 0) || 0;

      // Comparação com período anterior
      let comparison = {
        leadsChange: 0,
        revenueChange: 0,
        conversionRateChange: 0,
      };

      if (compareWithPrevious) {
        const periodDays = differenceInDays(endDate, startDate);
        const previousStartDate = subDays(startDate, periodDays);
        const previousEndDate = subDays(endDate, periodDays);

        const { data: previousLeads } = await supabase
          .from("crm_leads")
          .select("*")
          .eq("workspace_id", workspaceId)
          .gte("created_at", previousStartDate.toISOString())
          .lte("created_at", previousEndDate.toISOString());

        const previousTotalLeads = previousLeads?.length || 0;
        const previousConvertedLeads = previousLeads?.filter((l) => l.status === "won").length || 0;
        const previousConversionRate = previousTotalLeads > 0 
          ? (previousConvertedLeads / previousTotalLeads) * 100 
          : 0;
        const previousRevenue = previousLeads
          ?.filter((l) => l.status === "won")
          .reduce((sum, l) => sum + (l.value || 0), 0) || 0;

        comparison = {
          leadsChange: calculatePercentageChange(totalLeads, previousTotalLeads),
          revenueChange: calculatePercentageChange(totalRevenue, previousRevenue),
          conversionRateChange: calculatePercentageChange(conversionRate, previousConversionRate),
        };
      }

      // Top fontes por receita
      const sourceRevenue: Record<string, { revenue: number; leads: number }> = {};
      currentLeads?.forEach((lead) => {
        const source = lead.utm_source || "Direto";
        if (!sourceRevenue[source]) {
          sourceRevenue[source] = { revenue: 0, leads: 0 };
        }
        sourceRevenue[source].leads++;
        if (lead.status === "won") {
          sourceRevenue[source].revenue += lead.value || 0;
        }
      });

      const topSources = Object.entries(sourceRevenue)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Gerar insights automáticos
      const topInsights = generateInsights({
        totalLeads,
        convertedLeads,
        conversionRate,
        totalRevenue,
        comparison,
        currentLeads: currentLeads || [],
        topSources,
      });

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalLeads,
          convertedLeads,
          totalRevenue,
          avgTicket,
          conversionRate,
          avgConversionTime,
          pipelineValue,
        },
        comparison,
        topInsights,
        topSources,
      };
    },
    enabled: !!workspaceId,
  });
}

function generateInsights(data: any): Array<{
  type: "success" | "warning" | "info";
  title: string;
  description: string;
  metric?: string;
}> {
  const insights = [];

  // Insight 1: Performance de conversão
  if (data.conversionRate > 20) {
    insights.push({
      type: "success" as const,
      title: "Performance acima da média",
      description: `Taxa de conversão de ${data.conversionRate.toFixed(1)}% está ${(data.conversionRate - 15).toFixed(1)}% acima da média esperada`,
      metric: `${data.conversionRate.toFixed(1)}%`,
    });
  } else if (data.conversionRate < 10) {
    insights.push({
      type: "warning" as const,
      title: "Taxa de conversão baixa",
      description: `Taxa de conversão de ${data.conversionRate.toFixed(1)}% está abaixo do esperado. Revise o processo de qualificação`,
      metric: `${data.conversionRate.toFixed(1)}%`,
    });
  }

  // Insight 2: Crescimento/Queda de receita
  if (data.comparison.revenueChange !== 0 && Math.abs(data.comparison.revenueChange) > 10) {
    insights.push({
      type: data.comparison.revenueChange > 0 ? "success" as const : "warning" as const,
      title: data.comparison.revenueChange > 0 ? "Crescimento de receita" : "Queda de receita",
      description: `Receita ${data.comparison.revenueChange > 0 ? "aumentou" : "diminuiu"} ${Math.abs(data.comparison.revenueChange).toFixed(1)}% em relação ao período anterior`,
      metric: `${data.comparison.revenueChange > 0 ? "+" : ""}${data.comparison.revenueChange.toFixed(1)}%`,
    });
  }

  // Insight 3: Melhor fonte
  if (data.topSources && data.topSources.length > 0 && data.topSources[0].revenue > 0) {
    const topSource = data.topSources[0];
    insights.push({
      type: "info" as const,
      title: "Fonte com melhor desempenho",
      description: `${topSource.name} gerou R$ ${topSource.revenue.toLocaleString("pt-BR")} em receita com ${topSource.leads} leads`,
      metric: topSource.name,
    });
  }

  // Insight 4: Leads quentes
  const hotLeads = data.currentLeads.filter((l: any) => l.temperature === "quente" && !l.won && !l.lost);
  if (hotLeads.length > 0) {
    const hotValue = hotLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
    insights.push({
      type: "info" as const,
      title: "Oportunidades quentes no pipeline",
      description: `${hotLeads.length} leads qualificados como "quente" no pipeline com potencial de R$ ${hotValue.toLocaleString("pt-BR")}`,
      metric: `${hotLeads.length} leads`,
    });
  }

  // Insight 5: Crescimento de leads
  if (data.comparison.leadsChange !== 0 && Math.abs(data.comparison.leadsChange) > 15) {
    insights.push({
      type: data.comparison.leadsChange > 0 ? "success" as const : "warning" as const,
      title: data.comparison.leadsChange > 0 ? "Aumento de leads" : "Redução de leads",
      description: `Número de leads ${data.comparison.leadsChange > 0 ? "cresceu" : "diminuiu"} ${Math.abs(data.comparison.leadsChange).toFixed(1)}% vs período anterior`,
      metric: `${data.comparison.leadsChange > 0 ? "+" : ""}${data.comparison.leadsChange.toFixed(1)}%`,
    });
  }

  return insights.slice(0, 6);
}
