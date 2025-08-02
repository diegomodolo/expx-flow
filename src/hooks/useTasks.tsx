import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string;
  responsible_name: string;
  responsible_avatar: string;
  status: "todo" | "progress" | "review" | "done";
  priority: "high" | "medium" | "low";
  deadline: string;
  due_date?: string;
  start_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard';
  team?: {
    name: string;
    color: string;
  };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

export function useTasks() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar tarefas
  const {
    data: tasks = [],
    isLoading: loading,
    error,
    refetch: fetchTasks,
  } = useQuery({
    queryKey: ['tasks', activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Mutation para criar tarefa
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, "id" | "team">) => {
      if (!user || !activeCompany?.company_id) {
        throw new Error('User or company not found');
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          ...taskData,
          user_id: user.id,
          company_id: activeCompany.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast({
        title: "Tarefa criada",
        description: "Tarefa criada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar tarefa
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      console.log('🔄 Invalidating queries after task update');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast({
        title: "Tarefa atualizada",
        description: "Tarefa atualizada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar tarefa
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast({
        title: "Tarefa excluída",
        description: "Tarefa excluída com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir tarefa.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const createTask = (taskData: Omit<Task, "id" | "team">) => {
    return createTaskMutation.mutateAsync(taskData);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    return updateTaskMutation.mutateAsync({ id, updates });
  };

  const updateTaskStatus = (id: string, status: Task["status"]) => {
    const progress = status === "done" ? 100 : 
                    status === "review" ? 90 :
                    status === "progress" ? 50 : 0;
    
    return updateTaskMutation.mutateAsync({ 
      id, 
      updates: { status, progress } 
    });
  };

  const deleteTask = (id: string) => {
    return deleteTaskMutation.mutateAsync(id);
  };

  return {
    tasks,
    loading,
    error: error as Error | null,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}