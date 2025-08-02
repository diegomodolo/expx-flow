import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface TaskStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  review_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  avg_completion_days: number;
}

export const useTaskStats = () => {
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ['task-stats', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) {
        throw new Error('No company selected');
      }

      const { data, error } = await supabase
        .from('task_stats')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .single();

      if (error) {
        console.error('Error fetching task stats:', error);
        throw error;
      }

      return data as TaskStats;
    },
    enabled: !!activeCompany?.company_id,
  });
};