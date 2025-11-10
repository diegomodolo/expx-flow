import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface StageMetrics {
  stageId: string;
  stageName: string;
  stageColor: string;
  leadsCount: number;
  conversionRate: number;
  avgTimeInStage: number;
  stagnantLeads: number;
}

export interface PipelineMetrics {
  totalLeads: number;
  totalValue: number;
  avgConversionTime: number;
  overallConversionRate: number;
  stageMetrics: StageMetrics[];
  bottleneckStage: string | null;
}

export function useCRMPipelineAnalysis(workspaceId: string, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["crm-pipeline-analysis", workspaceId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<PipelineMetrics> => {
      // Buscar estágios
      const { data: stages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (stagesError) throw stagesError;

      // Buscar leads do período
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (leadsError) throw leadsError;

      // Buscar atividades de mudança de estágio
      const { data: activities, error: activitiesError } = await supabase
        .from("crm_lead_activities")
        .select("*")
        .eq("activity_type", "stage_change")
        .in("lead_id", leads?.map(l => l.id) || [])
        .order("created_at", { ascending: true });

      if (activitiesError) throw activitiesError;

      const totalLeads = leads?.length || 0;
      const totalValue = leads?.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0) || 0;

      // Calcular métricas por estágio
      const stageMetrics: StageMetrics[] = stages?.map(stage => {
        const leadsInStage = leads?.filter(l => l.stage_id === stage.id) || [];
        const leadsCount = leadsInStage.length;

        // Calcular taxa de conversão (leads que avançaram deste estágio)
        const leadsAdvanced = activities?.filter(a => a.from_stage_id === stage.id).length || 0;
        const conversionRate = leadsCount > 0 ? (leadsAdvanced / leadsCount) * 100 : 0;

        // Calcular tempo médio no estágio
        const stageTimes = leadsInStage.map(lead => {
          const leadActivities = activities?.filter(a => 
            a.lead_id === lead.id && 
            (a.from_stage_id === stage.id || a.to_stage_id === stage.id)
          ) || [];

          if (leadActivities.length === 0) {
            const daysSinceCreation = Math.ceil(
              (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceCreation;
          }

          const entryTime = leadActivities.find(a => a.to_stage_id === stage.id)?.created_at;
          const exitTime = leadActivities.find(a => a.from_stage_id === stage.id)?.created_at;

          if (entryTime && exitTime) {
            return Math.ceil(
              (new Date(exitTime).getTime() - new Date(entryTime).getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          return 0;
        });

        const avgTimeInStage = stageTimes.length > 0
          ? Math.round(stageTimes.reduce((sum, t) => sum + t, 0) / stageTimes.length)
          : 0;

        // Leads estagnados (mais de 30 dias sem movimentação)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const stagnantLeads = leadsInStage.filter(lead => {
          const lastActivity = activities
            ?.filter(a => a.lead_id === lead.id)
            .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0];

          if (!lastActivity) {
            return new Date(lead.created_at) < thirtyDaysAgo;
          }

          return new Date(lastActivity.created_at || '') < thirtyDaysAgo;
        }).length;

        return {
          stageId: stage.id,
          stageName: stage.name,
          stageColor: stage.color || '#137fec',
          leadsCount,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgTimeInStage,
          stagnantLeads
        };
      }) || [];

      // Identificar gargalo (estágio com menor taxa de conversão)
      const bottleneckStage = stageMetrics.length > 0
        ? stageMetrics.reduce((min, stage) => 
            stage.conversionRate < min.conversionRate ? stage : min
          ).stageName
        : null;

      // Calcular tempo médio de conversão total
      const lastStage = stages?.[stages.length - 1];
      const convertedLeads = leads?.filter(l => l.stage_id === lastStage?.id) || [];
      const conversionTimes = convertedLeads.map(lead => {
        return Math.ceil(
          (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      });
      const avgConversionTime = conversionTimes.length > 0
        ? Math.round(conversionTimes.reduce((sum, t) => sum + t, 0) / conversionTimes.length)
        : 0;

      const overallConversionRate = totalLeads > 0
        ? (convertedLeads.length / totalLeads) * 100
        : 0;

      return {
        totalLeads,
        totalValue,
        avgConversionTime,
        overallConversionRate: Math.round(overallConversionRate * 10) / 10,
        stageMetrics,
        bottleneckStage
      };
    },
    enabled: !!workspaceId
  });
}
