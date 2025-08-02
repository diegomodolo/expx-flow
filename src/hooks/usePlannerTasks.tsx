import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Task } from "./useTasks";
import { PlannerTimeSlot } from "./usePlannerSlots";

export function usePlannerTasks(plannedDate: Date) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  // Query para buscar tarefas do dia específico
  const {
    data: tasks = [],
    isLoading: loading,
    error,
    refetch: fetchPlannerTasks,
  } = useQuery({
    queryKey: ['planner-tasks', activeCompany?.company_id, plannedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];
      
      const dateStr = plannedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .neq("status", "done")
        .or(`deadline.eq.${dateStr},start_date.gte.${dateStr}T00:00:00,start_date.lte.${dateStr}T23:59:59`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Função para agrupar tarefas por slot baseado no horário
  const getTasksBySlot = (timeSlot: PlannerTimeSlot) => {
    return tasks.filter(task => {
      // Se a tarefa tem start_date, usar o horário dela
      if (task.start_date) {
        const taskTime = new Date(task.start_date).toTimeString().slice(0, 8);
        return taskTime >= timeSlot.start_time && taskTime <= timeSlot.end_time;
      }
      
      // Se não tem start_date mas tem deadline no dia, vai para o primeiro slot
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline).toISOString().split('T')[0];
        const plannedDateStr = plannedDate.toISOString().split('T')[0];
        return deadlineDate === plannedDateStr;
      }
      
      return false;
    }).sort((a, b) => {
      // Priorizar tarefas com start_date definido
      if (a.start_date && !b.start_date) return -1;
      if (!a.start_date && b.start_date) return 1;
      if (a.start_date && b.start_date) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      return 0;
    });
  };

  // Função para obter tarefas sem horário específico (apenas deadline)
  const getTasksWithoutTime = () => {
    const plannedDateStr = plannedDate.toISOString().split('T')[0];
    
    return tasks.filter(task => {
      // Tarefas que têm deadline no dia mas não têm start_date
      if (task.deadline && !task.start_date) {
        const deadlineDate = new Date(task.deadline).toISOString().split('T')[0];
        return deadlineDate === plannedDateStr;
      }
      return false;
    });
  };

  return {
    tasks,
    loading,
    error: error as Error | null,
    fetchPlannerTasks,
    getTasksBySlot,
    getTasksWithoutTime,
  };
}