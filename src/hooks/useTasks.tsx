import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
  progress: number;
  team?: {
    name: string;
    color: string;
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Omit<Task, "id" | "team">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          ...taskData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchTasks(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tarefa");
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa");
    }
  };

  const updateTaskStatus = async (id: string, status: Task["status"]) => {
    try {
      const progress = status === "done" ? 100 : 
                      status === "review" ? 90 :
                      status === "progress" ? 50 : 0;

      const { error } = await supabase
        .from("tasks")
        .update({ status, progress })
        .eq("id", id);

      if (error) throw error;
      await fetchTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status da tarefa");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar tarefa");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}