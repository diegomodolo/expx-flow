import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useTeams, Team } from "@/hooks/useTeams";
import { differenceInHours, startOfDay, endOfDay, addDays, isWeekend } from "date-fns";

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
}

export interface SquadMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  user_id: string;
  discord_user_id?: string | null;
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

      // Backlog: tasks with status 'todo' and no start_date
      const { data: backlog } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", selectedTeamId)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "todo")
        .is("start_date", null)
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

      setBacklogTasks((backlog || []) as CommandCenterTask[]);
      setTimelineTasks((timeline || []) as CommandCenterTask[]);
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

  const assignTask = async (taskId: string, memberId: string, memberName: string, startDate: Date) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_user_id: memberId,
        responsible_name: memberName,
        start_date: startDate.toISOString(),
        status: "in_progress" as any,
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
