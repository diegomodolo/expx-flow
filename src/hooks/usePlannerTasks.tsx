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
      
      // Buscar tarefas
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .neq("status", "done")
        .or(`deadline.gte.${dateStr},start_date.gte.${dateStr}T00:00:00,start_date.lte.${dateStr}T23:59:59`)
        .order("created_at", { ascending: true });

      if (tasksError) throw tasksError;
      
      if (!tasksData || tasksData.length === 0) return [];

      // Buscar perfis dos usuários
      const userIds = [...new Set(tasksData.map(task => task.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, avatar_url, full_name")
        .in("user_id", userIds);

      if (profilesError) {
        console.warn("Erro ao buscar perfis:", profilesError);
      }

      // Combinar dados
      const tasksWithProfiles = tasksData.map(task => ({
        ...task,
        user_profile: profilesData?.find(profile => profile.user_id === task.user_id) || null
      }));

      return tasksWithProfiles;
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Função para agrupar tarefas por slot baseado no horário
  const getTasksBySlot = (timeSlot: PlannerTimeSlot) => {
    const dateStr = plannedDate.toISOString().split('T')[0];
    
    const filteredTasks = tasks.filter(task => {
      // Se a tarefa tem start_date, usar o horário dela
      if (task.start_date) {
        // Verificar se é do mesmo dia primeiro
        const taskDateStr = new Date(task.start_date).toISOString().split('T')[0];
        if (taskDateStr !== dateStr) {
          return false;
        }
        
        // Converter para horário local e extrair apenas o horário
        const taskDate = new Date(task.start_date);
        const taskTime = `${taskDate.getHours().toString().padStart(2, '0')}:${taskDate.getMinutes().toString().padStart(2, '0')}:${taskDate.getSeconds().toString().padStart(2, '0')}`;
        
        // Normalizar para formato HH:MM:SS se necessário
        const slotStartTime = timeSlot.start_time.length === 5 ? `${timeSlot.start_time}:00` : timeSlot.start_time;
        const slotEndTime = timeSlot.end_time.length === 5 ? `${timeSlot.end_time}:00` : timeSlot.end_time;
        
        console.log(`🔍 Checking task "${task.title}" - taskTime: ${taskTime}, slot: ${slotStartTime} to ${slotEndTime}`);
        
        // Comparar strings de tempo diretamente
        const isInSlot = taskTime >= slotStartTime && taskTime <= slotEndTime;
        
        console.log(`📍 Task "${task.title}" ${isInSlot ? 'MATCHES' : 'does not match'} slot "${timeSlot.name}"`);
        
        return isInSlot;
      }
      
      // Se não tem start_date mas tem deadline no dia, não atribuir automaticamente a um slot
      // Deixar isso para tarefas sem horário específico
      return false;
    });
    
    return filteredTasks.sort((a, b) => {
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
    const tasksWithoutTime = tasks.filter(task => {
      // Tarefas que não têm start_date (independente do deadline)
      const hasNoStartDate = !task.start_date;
      return hasNoStartDate;
    });
    
    return tasksWithoutTime;
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