import { useState, useEffect, useCallback, useRef } from "react";
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
  parent_task_id: string | null;
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
  const companyId = activeCompany?.company_id;
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

  const [viewDate, setViewDate] = useState<Date>(new Date());

  const fetchTasks = useCallback(async () => {
    if (!selectedTeamId || !companyId) return;
    setLoading(true);
    try {
      const targetDate = viewDate;
      const dayStart = startOfDay(targetDate).toISOString();
      const dayEnd = endOfDay(targetDate).toISOString();

      // Backlog: tasks with status 'todo' and no start_date, excluding tasks still in backlog state
      const { data: backlog } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", selectedTeamId)
        .eq("company_id", companyId)
        .eq("status", "todo")
        .is("start_date", null)
        .neq("task_state", "backlog")
        .order("created_at", { ascending: true });

      // Timeline: tasks with start_date on the selected day
      const { data: timeline } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", selectedTeamId)
        .eq("company_id", companyId)
        .gte("start_date", dayStart)
        .lte("start_date", dayEnd)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true });

      // Fetch task_clients for all tasks
      const allTaskIds = [...(backlog || []), ...(timeline || [])].map(t => t.id);
      const taskClientsMap: Record<string, TaskClient[]> = {};
      
      if (allTaskIds.length > 0) {
        const { data: tcData } = await (supabase as unknown)
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

      const enrichTask = (t: unknown): CommandCenterTask => ({
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
  }, [selectedTeamId, companyId, viewDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Keep a stable ref to fetchTasks so the realtime subscription doesn't re-subscribe on every callback change
  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);

  // Realtime subscription (debounced to avoid jarring resets during drag-drop)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedTeamId) return;
    const channel = supabase
      .channel(`command-center-${selectedTeamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `team_id=eq.${selectedTeamId}` }, () => {
        if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = setTimeout(() => fetchTasksRef.current(), 2000);
      })
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedTeamId]);

  const assignTask = async (taskId: string, userId: string, memberName: string, startDate: Date) => {
    const task = backlogTasks.find(t => t.id === taskId);
    const estimatedMinutes = task?.ai_estimated_minutes || 20;
    const deadlineDate = new Date(startDate.getTime() + estimatedMinutes * 60000);

    // Fetch the employee's board first column with status 'todo'
    let boardColumnId: string | null = null;
    try {
      const { data: columns } = await (supabase
        .from('task_board_columns' as unknown)
        .select('id, status, order_index')
        .eq('user_id', userId)
        .eq('company_id', companyId || '')
        .order('order_index', { ascending: true }) as unknown);

      if (columns && columns.length > 0) {
        const todoCol = columns.find((c: unknown) => c.status === 'todo');
        boardColumnId = todoCol?.id || columns[0]?.id || null;
      }
    } catch (e) {
      console.warn('Could not fetch board columns for user', e);
    }

    // Optimistic update: move task from backlog to timeline locally
    if (task) {
      const updatedTask: CommandCenterTask = {
        ...task,
        assigned_user_id: userId,
        responsible_name: memberName,
        start_date: startDate.toISOString(),
        status: "todo",
        task_state: "execucao",
        deadline: deadlineDate.toISOString().split('T')[0],
        due_date: deadlineDate.toISOString(),
        quadro_column_id: boardColumnId,
      } as unknown;
      setBacklogTasks(prev => prev.filter(t => t.id !== taskId));
      setTimelineTasks(prev => [...prev, updatedTask].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')));
    }
    
    const updatePayload: unknown = {
      assigned_user_id: userId,
      responsible_name: memberName,
      start_date: startDate.toISOString(),
      status: "todo",
      task_state: "execucao",
      deadline: deadlineDate.toISOString().split('T')[0],
      due_date: deadlineDate.toISOString(),
    };

    if (boardColumnId) {
      updatePayload.quadro_column_id = boardColumnId;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId);
    if (error) {
      if (task) {
        setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
        setBacklogTasks(prev => [...prev, task]);
      }
      throw error;
    }
    // Realtime subscription handles the sync — no manual refetch needed
  };

  const unassignTask = async (taskId: string) => {
    const task = timelineTasks.find(t => t.id === taskId);
    
    // Optimistic update: move task from timeline to backlog
    if (task) {
      const updatedTask: CommandCenterTask = {
        ...task,
        assigned_user_id: null,
        responsible_name: '',
        start_date: null,
        status: "todo",
        task_state: "planejamento",
        due_date: null,
        quadro_column_id: null,
      } as unknown;
      setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
      setBacklogTasks(prev => [...prev, updatedTask]);
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_user_id: null,
        responsible_name: '',
        start_date: null,
        status: "todo" as unknown,
        task_state: "planejamento" as unknown,
        due_date: null,
        quadro_column_id: null,
      } as unknown)
      .eq("id", taskId);
    if (error) {
      if (task) {
        setBacklogTasks(prev => prev.filter(t => t.id !== taskId));
        setTimelineTasks(prev => [...prev, task]);
      }
      throw error;
    }
    fetchTasks();
  };

  const returnToBacklogCenter = async (taskId: string) => {
    const task = [...timelineTasks, ...backlogTasks].find(t => t.id === taskId);

    // Optimistic update: remove from both lists
    setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
    setBacklogTasks(prev => prev.filter(t => t.id !== taskId));

    const resetFields = {
      assigned_user_id: null,
      responsible_name: '',
      start_date: null,
      status: "todo" as unknown,
      task_state: "backlog" as unknown,
      due_date: null,
      quadro_column_id: null,
    } as unknown;

    // Update the task itself
    const { error } = await supabase
      .from("tasks")
      .update(resetFields)
      .eq("id", taskId);

    if (error) {
      // Rollback optimistic update
      if (task) {
        if (task.start_date) {
          setTimelineTasks(prev => [...prev, task]);
        } else {
          setBacklogTasks(prev => [...prev, task]);
        }
      }
      throw error;
    }

    // Also return all subtasks of this task to backlog
    await supabase
      .from("tasks")
      .update(resetFields)
      .eq("parent_task_id", taskId);

    fetchTasks();
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
    setTimelineTasks,
    loading,
    assignTask,
    unassignTask,
    returnToBacklogCenter,
    getAgingHours,
    getTodayMetrics,
    getNextBusinessDay,
    fetchTasks,
    viewDate,
    setViewDate,
  };
}
