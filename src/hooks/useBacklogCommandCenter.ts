import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { differenceInHours, subDays } from "date-fns";

export interface BacklogTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  responsible_name: string;
  assigned_user_id: string | null;
  team_id: string;
  start_date: string | null;
  deadline: string;
  ai_estimated_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  task_type: string;
  progress: number;
  recurring_template_id: string | null;
  checklist: any;
  related_client_id: string | null;
}

export interface BacklogClient {
  id: string;
  name: string;
  avatar: string | null;
  totalMinutes: number;
  taskCount: number;
  temperature: "blue" | "orange" | "red";
}

export function useBacklogCommandCenter() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"urgency" | "type" | "client">("client");

  // Fetch backlog tasks (status todo, no start_date)
  const { data: backlogTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["backlog-center-tasks", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "todo")
        .is("start_date", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as BacklogTask[];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Fetch task_clients to map tasks -> clients
  const { data: taskClients = [] } = useQuery({
    queryKey: ["backlog-center-task-clients", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      const { data, error } = await (supabase as any)
        .from("task_clients")
        .select("task_id, client_id")
        .eq("company_id", activeCompany.company_id);
      if (error) throw error;
      return (data || []) as { task_id: string; client_id: string }[];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["backlog-center-clients", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name, avatar")
        .eq("company_id", activeCompany.company_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Fetch recent completed/distributed tasks for temperature calc
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["backlog-center-activity", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      const threeDaysAgo = subDays(new Date(), 3).toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .select("id, related_client_id, start_date, completed_at, created_at, status")
        .eq("company_id", activeCompany.company_id)
        .gte("created_at", threeDaysAgo);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Build task->client mapping
  const taskToClients = useMemo(() => {
    const map = new Map<string, string[]>();
    taskClients.forEach((tc: any) => {
      const existing = map.get(tc.task_id) || [];
      existing.push(tc.client_id);
      map.set(tc.task_id, existing);
    });
    // Also include related_client_id
    backlogTasks.forEach((t) => {
      if (t.related_client_id) {
        const existing = map.get(t.id) || [];
        if (!existing.includes(t.related_client_id)) {
          existing.push(t.related_client_id);
          map.set(t.id, existing);
        }
      }
    });
    return map;
  }, [taskClients, backlogTasks]);

  // Build backlog clients with stats
  const backlogClients = useMemo((): BacklogClient[] => {
    const clientMap = new Map<string, { minutes: number; count: number }>();

    backlogTasks.forEach((task) => {
      const clientIds = taskToClients.get(task.id) || [];
      const minutes = task.ai_estimated_minutes || 18;
      clientIds.forEach((cid) => {
        const existing = clientMap.get(cid) || { minutes: 0, count: 0 };
        existing.minutes += minutes;
        existing.count += 1;
        clientMap.set(cid, existing);
      });
      // Tasks without clients go to "unassigned"
      if (clientIds.length === 0) {
        const existing = clientMap.get("unassigned") || { minutes: 0, count: 0 };
        existing.minutes += minutes;
        existing.count += 1;
        clientMap.set("unassigned", existing);
      }
    });

    const result: BacklogClient[] = [];

    clients.forEach((client: any) => {
      const stats = clientMap.get(client.id);
      if (!stats) return;

      // Temperature calc
      const twoDaysAgo = subDays(new Date(), 2);
      const clientRecentDistributed = recentActivity.filter(
        (t: any) => t.related_client_id === client.id && t.start_date
      );
      const clientRecentCreated = recentActivity.filter(
        (t: any) => t.related_client_id === client.id
      );
      const lastDistributed = clientRecentDistributed.sort(
        (a: any, b: any) => new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime()
      )[0];

      let temperature: "blue" | "orange" | "red" = "blue";
      if (!lastDistributed || new Date(lastDistributed.start_date!) < twoDaysAgo) {
        temperature = "red";
      } else if (clientRecentCreated.length > clientRecentDistributed.length * 1.5) {
        temperature = "orange";
      }

      result.push({
        id: client.id,
        name: client.name,
        avatar: client.avatar,
        totalMinutes: stats.minutes,
        taskCount: stats.count,
        temperature,
      });
    });

    // Add unassigned
    const unassigned = clientMap.get("unassigned");
    if (unassigned) {
      result.push({
        id: "unassigned",
        name: "Sem cliente",
        avatar: null,
        totalMinutes: unassigned.minutes,
        taskCount: unassigned.count,
        temperature: "blue",
      });
    }

    return result.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [backlogTasks, clients, taskToClients, recentActivity]);

  // Filter tasks by selected client
  const filteredTasks = useMemo(() => {
    let tasks = backlogTasks;
    if (selectedClientId) {
      if (selectedClientId === "unassigned") {
        tasks = tasks.filter((t) => {
          const clientIds = taskToClients.get(t.id) || [];
          return clientIds.length === 0;
        });
      } else {
        tasks = tasks.filter((t) => {
          const clientIds = taskToClients.get(t.id) || [];
          return clientIds.includes(selectedClientId);
        });
      }
    }

    // Smart sort: high priority + low minutes first
    tasks = [...tasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (pA !== pB) return pA - pB;
      return (a.ai_estimated_minutes || 18) - (b.ai_estimated_minutes || 18);
    });

    return tasks;
  }, [backlogTasks, selectedClientId, taskToClients]);

  // Selection helpers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
  };

  const clearSelection = () => setSelectedTaskIds(new Set());

  // Selected tasks stats
  const selectionStats = useMemo(() => {
    const selected = backlogTasks.filter((t) => selectedTaskIds.has(t.id));
    const totalMinutes = selected.reduce((sum, t) => sum + (t.ai_estimated_minutes || 18), 0);
    const capacityPercent = Math.round((totalMinutes / 360) * 100);
    return { count: selected.length, totalMinutes, capacityPercent };
  }, [selectedTaskIds, backlogTasks]);

  // Readiness check
  const getReadiness = (task: BacklogTask) => {
    const hasDescription = !!task.description && task.description.trim().length > 0;
    const hasEstimate = !!task.ai_estimated_minutes && task.ai_estimated_minutes > 0;
    const hasClient = (taskToClients.get(task.id) || []).length > 0;
    return { ready: hasDescription && hasEstimate && hasClient, hasDescription, hasEstimate, hasClient };
  };

  const getAgingHours = (createdAt: string) => differenceInHours(new Date(), new Date(createdAt));

  // Bulk release mutation
  const releaseToLeadersMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "todo" as any,
          start_date: new Date().toISOString(),
        })
        .in("id", taskIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      clearSelection();
      toast({ title: "Tarefas liberadas", description: "Tarefas liberadas para os líderes." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao liberar tarefas.", variant: "destructive" });
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ taskIds, userId, userName }: { taskIds: string[]; userId: string; userName: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          assigned_user_id: userId,
          responsible_name: userName,
          start_date: new Date().toISOString(),
          status: "in_progress" as any,
        })
        .in("id", taskIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      clearSelection();
      toast({ title: "Tarefas atribuídas", description: "Tarefas atribuídas com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao atribuir tarefas.", variant: "destructive" });
    },
  });

  // Total backlog stats
  const totalStats = useMemo(() => {
    const totalMinutes = backlogTasks.reduce((sum, t) => sum + (t.ai_estimated_minutes || 18), 0);
    const totalHours = Math.round(totalMinutes / 60);
    return { totalTasks: backlogTasks.length, totalMinutes, totalHours };
  }, [backlogTasks]);

  return {
    backlogClients,
    filteredTasks,
    tasksLoading,
    selectedClientId,
    setSelectedClientId,
    selectedTaskIds,
    toggleTaskSelection,
    selectAll,
    clearSelection,
    selectionStats,
    totalStats,
    getReadiness,
    getAgingHours,
    viewMode,
    setViewMode,
    releaseToLeaders: (ids: string[]) => releaseToLeadersMutation.mutateAsync(ids),
    bulkAssign: (ids: string[], userId: string, userName: string) =>
      bulkAssignMutation.mutateAsync({ taskIds: ids, userId, userName }),
    taskToClients,
    clients,
  };
}
