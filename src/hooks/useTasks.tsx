import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { sendDiscordTaskNotification } from "@/hooks/useDiscordNotifications";

export interface Task {
  id: string;
  user_id?: string;
  team_id: string;
  title: string;
  description: string;
  responsible_name: string;
  responsible_avatar: string;
  status: "todo" | "progress" | "review" | "done" | "waiting_approval" | "cancelled" | "blocked" | "paused";
  priority: "high" | "medium" | "low";
  deadline: string;
  due_date?: string;
  start_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard' | 'flow' | 'ghost';
  task_state?: 'backlog' | 'planejamento' | 'execucao';
  related_campaign_id?: string;
  related_client_id?: string;
  created_at?: string;
  assigned_user_id?: string;
  visibility_date?: string;
  quadro_column_id?: string | null;
  etapa?: string | null;
  parent_task_id?: string | null;
  task_type?: string | null;
  team?: {
    name: string;
    color: string;
  };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  campaign?: {
    name: string;
    client?: {
      name: string;
    };
  } | null;
  client?: {
    name: string;
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
      
      // Buscar tarefas básicas
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

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

      // Buscar campanhas relacionadas se existirem
      const campaignIds = [...new Set(tasksData.map(task => task.related_campaign_id).filter(Boolean))];
      let campaignsData: any[] = [];
      if (campaignIds.length > 0) {
        const { data, error } = await supabase
          .from("campaigns")
          .select(`
            id,
            name,
            client:clients(name)
          `)
          .in("id", campaignIds);
        
        if (!error) {
          campaignsData = data || [];
        }
      }

      // Buscar clientes relacionados se existirem
      const clientIds = [...new Set(tasksData.map(task => task.related_client_id).filter(Boolean))];
      let clientsData: any[] = [];
      if (clientIds.length > 0) {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        
        if (!error) {
          clientsData = data || [];
        }
      }

      // Combinar todos os dados
      const tasksWithAllData = tasksData.map(task => ({
        ...task,
        user_profile: profilesData?.find(profile => profile.user_id === task.user_id) || null,
        campaign: task.related_campaign_id ? 
          campaignsData.find(campaign => campaign.id === task.related_campaign_id) || null : null,
        client: task.related_client_id ? 
          clientsData.find(client => client.id === task.related_client_id) || null : null
      }));

      return tasksWithAllData;
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Mutation para criar tarefa
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, "id" | "team" | "user_profile">) => {
      if (!user || !activeCompany?.company_id) {
        throw new Error('User or company not found');
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          ...taskData,
          user_id: taskData.user_id || user.id,
          company_id: activeCompany.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast({
        title: "Tarefa criada",
        description: "Tarefa criada com sucesso.",
      });

      // Fire-and-forget Discord notification
      if (activeCompany?.company_id && data) {
        sendDiscordTaskNotification(activeCompany.company_id, "task_created", {
          title: data.title,
          responsible_name: data.responsible_name,
          priority: data.priority,
          due_date: data.due_date || data.deadline,
          team_id: data.team_id,
        });
      }
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
      const isTriggeredConflict = (err: any) =>
        err?.message?.includes('tuple to be updated was already modified') ||
        err?.code === '55000';

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (error) {
        if (isTriggeredConflict(error)) {
          console.warn('[useTasks] Trigger conflict, retrying in 400ms...');
          // Wait for trigger transaction to fully commit, then retry
          await new Promise(resolve => setTimeout(resolve, 400));
          const { error: retryError } = await supabase
            .from("tasks")
            .update(updates)
            .eq("id", id);

          if (retryError) {
            if (isTriggeredConflict(retryError)) {
              // Still conflicting — the task flow trigger fully owns this move.
              // Just let the invalidation bring the correct state.
              console.warn('[useTasks] Trigger conflict persists after retry — letting task flow handle it.');
              return;
            }
            throw retryError;
          }
          return;
        }
        throw error;
      }
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', activeCompany?.company_id] });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueryData(['tasks', activeCompany?.company_id]);

      // Optimistically update the task in the cache so the card moves immediately
      queryClient.setQueryData(['tasks', activeCompany?.company_id], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, ...updates } : task
        );
      });

      return { previousTasks };
    },
    onError: (error, _variables, context: any) => {
      // Revert the optimistic update on a real (non-trigger) error
      if (context?.previousTasks !== undefined) {
        queryClient.setQueryData(['tasks', activeCompany?.company_id], context.previousTasks);
      }
      console.error('Error updating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to sync with the real DB state (including trigger-driven moves)
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
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
  const createTask = (taskData: Omit<Task, "id" | "team" | "user_profile">) => {
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