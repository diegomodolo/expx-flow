import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Task } from "./useTasks";

export interface PlannerDailyTask {
  id: string;
  company_id: string;
  task_id: string;
  time_slot_id: string;
  planned_date: string;
  created_at: string;
  updated_at: string;
  tasks?: Task & {
    team?: {
      name: string;
      color: string;
    };
  };
}

export function usePlannerTasks(plannedDate: Date) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateString = plannedDate.toISOString().split('T')[0];

  // Query para buscar tarefas do planner
  const {
    data: plannerTasks = [],
    isLoading: loading,
    error,
    refetch: fetchPlannerTasks,
  } = useQuery({
    queryKey: ['planner-tasks', activeCompany?.company_id, dateString],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from("planner_daily_tasks")
        .select(`
          *,
          tasks(*,team:teams(name,color))
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("planned_date", dateString);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Mutation para adicionar tarefa ao planner
  const addTaskToPlannerMutation = useMutation({
    mutationFn: async ({ taskId, timeSlotId }: { taskId: string; timeSlotId: string }) => {
      if (!user || !activeCompany?.company_id) {
        throw new Error('User or company not found');
      }

      const { data, error } = await supabase
        .from("planner_daily_tasks")
        .insert([{
          company_id: activeCompany.company_id,
          task_id: taskId,
          time_slot_id: timeSlotId,
          planned_date: dateString,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      toast({
        title: "Tarefa adicionada",
        description: "Tarefa adicionada ao planner com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error adding task to planner:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar tarefa ao planner.",
        variant: "destructive",
      });
    },
  });

  // Mutation para mover tarefa entre slots
  const moveTaskMutation = useMutation({
    mutationFn: async ({ plannerTaskId, newTimeSlotId }: { plannerTaskId: string; newTimeSlotId: string }) => {
      const { error } = await supabase
        .from("planner_daily_tasks")
        .update({ time_slot_id: newTimeSlotId })
        .eq("id", plannerTaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      toast({
        title: "Tarefa movida",
        description: "Tarefa movida com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error moving task:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover tarefa.",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover tarefa do planner
  const removeTaskFromPlannerMutation = useMutation({
    mutationFn: async (plannerTaskId: string) => {
      const { error } = await supabase
        .from("planner_daily_tasks")
        .delete()
        .eq("id", plannerTaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      toast({
        title: "Tarefa removida",
        description: "Tarefa removida do planner com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error removing task from planner:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover tarefa do planner.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const addTaskToPlanner = (taskId: string, timeSlotId: string) => {
    return addTaskToPlannerMutation.mutateAsync({ taskId, timeSlotId });
  };

  const moveTask = (plannerTaskId: string, newTimeSlotId: string) => {
    return moveTaskMutation.mutateAsync({ plannerTaskId, newTimeSlotId });
  };

  const removeTaskFromPlanner = (plannerTaskId: string) => {
    return removeTaskFromPlannerMutation.mutateAsync(plannerTaskId);
  };

  // Função para organizar tarefas por slot
  const getTasksBySlot = (timeSlotId: string) => {
    return plannerTasks
      .filter(pt => pt.time_slot_id === timeSlotId)
      .sort((a, b) => {
        // Ordena por horário de início se ambos tiverem start_date
        if (a.tasks?.start_date && b.tasks?.start_date) {
          return new Date(a.tasks.start_date).getTime() - new Date(b.tasks.start_date).getTime();
        }
        // Tarefas com horário específico aparecem primeiro
        if (a.tasks?.start_date && !b.tasks?.start_date) return -1;
        if (!a.tasks?.start_date && b.tasks?.start_date) return 1;
        // Se nenhuma tem horário, manter ordem original
        return 0;
      });
  };

  return {
    plannerTasks,
    loading,
    error: error as Error | null,
    fetchPlannerTasks,
    addTaskToPlanner,
    moveTask,
    removeTaskFromPlanner,
    getTasksBySlot,
  };
}