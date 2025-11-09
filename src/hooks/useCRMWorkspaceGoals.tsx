import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type GoalStatus = 'danger' | 'warning' | 'success' | 'exceeded' | 'no-goal';

interface WorkspaceGoal {
  id: string;
  workspace_id: string;
  company_id: string;
  target_leads: number | null;
  target_revenue: number | null;
  target_conversion_rate: number | null;
  target_closed_deals: number | null;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

interface GoalProgress {
  current: number;
  target: number | null;
  percentage: number;
  status: GoalStatus;
}

interface GoalsProgress {
  leads: GoalProgress;
  revenue: GoalProgress;
  conversion: GoalProgress;
  closedDeals: GoalProgress;
  hasAnyGoal: boolean;
  averageProgress: number;
}

const getGoalStatus = (percentage: number, hasGoal: boolean): GoalStatus => {
  if (!hasGoal) return 'no-goal';
  if (percentage > 100) return 'exceeded';
  if (percentage >= 90) return 'success';
  if (percentage >= 50) return 'warning';
  return 'danger';
};

const calculateProgress = (current: number, target: number | null): GoalProgress => {
  const percentage = target && target > 0 ? (current / target) * 100 : 0;
  const status = getGoalStatus(percentage, target !== null);
  
  return {
    current,
    target,
    percentage: Math.min(percentage, 999), // Cap at 999% for display
    status
  };
};

export const useCRMWorkspaceGoals = (workspaceId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Buscar metas do mês atual
  const { data: goal, isLoading } = useQuery({
    queryKey: ['crm-workspace-goals', workspaceId, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workspace_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;
      return data as WorkspaceGoal | null;
    },
    enabled: !!workspaceId
  });

  // Calcular progresso com métricas atuais
  const calculateGoalsProgress = (
    currentMetrics: {
      totalLeads: number;
      revenue: number;
      conversionRate: number;
      closedDeals: number;
    }
  ): GoalsProgress => {
    const leads = calculateProgress(currentMetrics.totalLeads, goal?.target_leads || null);
    const revenue = calculateProgress(currentMetrics.revenue, goal?.target_revenue || null);
    const conversion = calculateProgress(currentMetrics.conversionRate, goal?.target_conversion_rate || null);
    const closedDeals = calculateProgress(currentMetrics.closedDeals, goal?.target_closed_deals || null);

    const hasAnyGoal = !!(goal?.target_leads || goal?.target_revenue || goal?.target_conversion_rate || goal?.target_closed_deals);
    
    // Calcular média apenas das metas configuradas
    const configuredGoals = [
      goal?.target_leads ? leads.percentage : null,
      goal?.target_revenue ? revenue.percentage : null,
      goal?.target_conversion_rate ? conversion.percentage : null,
      goal?.target_closed_deals ? closedDeals.percentage : null
    ].filter((p): p is number => p !== null);

    const averageProgress = configuredGoals.length > 0
      ? configuredGoals.reduce((sum, p) => sum + p, 0) / configuredGoals.length
      : 0;

    return {
      leads,
      revenue,
      conversion,
      closedDeals,
      hasAnyGoal,
      averageProgress
    };
  };

  // Criar ou atualizar metas
  const saveGoalsMutation = useMutation({
    mutationFn: async (goals: {
      target_leads?: number | null;
      target_revenue?: number | null;
      target_conversion_rate?: number | null;
      target_closed_deals?: number | null;
    }) => {
      // Buscar workspace para pegar company_id
      const { data: workspace, error: workspaceError } = await supabase
        .from('crm_workspaces')
        .select('company_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      const goalData = {
        workspace_id: workspaceId,
        company_id: workspace.company_id,
        target_leads: goals.target_leads,
        target_revenue: goals.target_revenue,
        target_conversion_rate: goals.target_conversion_rate,
        target_closed_deals: goals.target_closed_deals,
        month: currentMonth,
        year: currentYear,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (goal?.id) {
        // Atualizar meta existente
        const { data, error } = await supabase
          .from('crm_workspace_goals')
          .update(goalData)
          .eq('id', goal.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar nova meta
        const { data, error } = await supabase
          .from('crm_workspace_goals')
          .insert(goalData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workspace-goals'] });
      toast({
        title: "Metas atualizadas",
        description: "Suas metas foram salvas com sucesso!"
      });
    },
    onError: (error) => {
      console.error('Error saving goals:', error);
      toast({
        title: "Erro ao salvar metas",
        description: "Não foi possível salvar as metas. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  return {
    goal,
    isLoading,
    calculateGoalsProgress,
    saveGoals: saveGoalsMutation.mutate,
    isSaving: saveGoalsMutation.isPending,
    currentMonth,
    currentYear
  };
};
