import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useTeams, Team } from "@/hooks/useTeams";
import { differenceInHours, startOfDay, endOfDay, addDays, isWeekend } from "date-fns";

export interface TaskClient {
  client_id: string;
  client_name: string;
  client_avatar: string | null;
}

export interface CommandCenterTask {
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
  clients?: TaskClient[];
}

export interface SquadMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  user_id: string;
  discord_user_id?: string | null;
  work_schedule_id?: string | null;
}

export function useCommandCenter() {
  const { activeCompany } = useCompany();
  const { teams, loading: teamsLoading } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [backlogTasks, setBacklogTasks] = useState<CommandCenterTask[]>([]);
  const [timelineTasks, setTimelineTasks] = useState<CommandCenterTask[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  // Auto-select first team
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const fetchTasks = useCallback(async () => {
    if (!selectedTeamId || !activeCompany) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Backlog: tasks with status 'todo' and no start_date, excluding tasks still in backlog state
      const { data: backlog } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", selectedTeamId)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "todo")
        .is("start_date", null)
        .neq("task_state", "backlog")
        .order("created_at", { ascending: true });

      // Timeline: tasks with start_date today
      const { data: timeline } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", selectedTeamId)
        .eq("company_id", activeCompany.company_id)
        .gte("start_date", todayStart)
        .lte("start_date", todayEnd)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true });

      // Fetch task_clients for all tasks
      const allTaskIds = [...(backlog || []), ...(timeline || [])].map(t => t.id);
      let taskClientsMap: Record<string, TaskClient[]> = {};
      
      if (allTaskIds.length > 0) {
        const { data: tcData } = await (supabase as any)
          .from("task_clients")
          .select("task_id, client_id, clients:client_id(name, avatar)")
          .in("task_id", allTaskIds);
        
        if (tcData) {
          for (const tc of tcData) {
            if (!taskClientsMap[tc.task_id]) taskClientsMap[tc.task_id] = [];
            taskClientsMap[tc.task_id].push({
              client_id: tc.client_id,
              client_name: tc.clients?.name || "Sem nome",
              client_avatar: tc.clients?.avatar || null,
            });
          }
        }
      }

      // Fallback: fetch client info for tasks using legacy related_client_id
      const tasksWithLegacyClient = [...(backlog || []), ...(timeline || [])]
        .filter(t => t.related_client_id && !taskClientsMap[t.id]);
      
      if (tasksWithLegacyClient.length > 0) {
        const clientIds = [...new Set(tasksWithLegacyClient.map(t => t.related_client_id))];
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, name, avatar")
          .in("id", clientIds);
        
        if (clientsData) {
          const clientsById = Object.fromEntries(clientsData.map(c => [c.id, c]));
          for (const task of tasksWithLegacyClient) {
            const client = clientsById[task.related_client_id];
            if (client) {
              taskClientsMap[task.id] = [{
                client_id: client.id,
                client_name: client.name || "Sem nome",
                client_avatar: client.avatar || null,
              }];
            }
          }
        }
      }

      const enrichTask = (t: any): CommandCenterTask => ({
        ...t,
        clients: taskClientsMap[t.id] || [],
      });

      setBacklogTasks((backlog || []).map(enrichTask));
      setTimelineTasks((timeline || []).map(enrichTask));
    } catch (err) {
      console.error("Error fetching command center tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, activeCompany]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedTeamId) return;
    const channel = supabase
      .channel(`command-center-${selectedTeamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `team_id=eq.${selectedTeamId}` }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTeamId, fetchTasks]);

  const assignTask = async (taskId: string, userId: string, memberName: string, startDate: Date) => {
    const estimatedMinutes = backlogTasks.find(t => t.id === taskId)?.ai_estimated_minutes || 20;
    const deadlineDate = new Date(startDate.getTime() + estimatedMinutes * 60000);
    
    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_user_id: userId,
        responsible_name: memberName,
        start_date: startDate.toISOString(),
        status: "progress" as any,
        task_state: "execucao" as any,
        deadline: deadlineDate.toISOString().split('T')[0],
        due_date: deadlineDate.toISOString(),
      })
      .eq("id", taskId);
    if (error) throw error;
  };

  const getAgingHours = (createdAt: string) => {
    return differenceInHours(new Date(), new Date(createdAt));
  };

  const getTodayMetrics = () => {
    const allTodayTasks = [...backlogTasks, ...timelineTasks];
    const completed = timelineTasks.filter(t => t.status === "done").length;
    const total = timelineTasks.length;
    const busy = selectedTeam?.members?.filter(m => 
      timelineTasks.some(t => t.assigned_user_id === m.id && t.status === "in_progress")
    ).length || 0;
    const totalMembers = selectedTeam?.members?.length || 1;

    return { completed, total, busy, totalMembers, busyPercent: Math.round((busy / totalMembers) * 100) };
  };

  const getNextBusinessDay = () => {
    let next = addDays(new Date(), 1);
    while (isWeekend(next)) next = addDays(next, 1);
    return next;
  };

  return {
    teams,
    teamsLoading,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    backlogTasks,
    timelineTasks,
    loading,
    assignTask,
    getAgingHours,
    getTodayMetrics,
    getNextBusinessDay,
    fetchTasks,
  };
}
