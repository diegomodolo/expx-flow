import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface Historia {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string;
  due_date: string | null;
  start_date: string | null;
  team_id: string;
  related_client_id: string | null;
  responsible_name: string;
  responsible_avatar: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  progress: number;
  // Joined
  team_name: string | null;
  team_color: string | null;
  client_name: string | null;
  client_logo: string | null;
  // Subtask counts
  subtasks_total: number;
  subtasks_done: number;
  subtasks: Subtask[];
  // Work time
  total_work_minutes: number;
}

export interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  responsible_name: string;
  deadline: string;
}

interface Filters {
  teamId: string;
  clientId: string;
  statusFilter: "open" | "in_progress" | "done" | "all";
  titleSearch: string;
}

export function useHistorias() {
  const { activeCompany } = useCompany();
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{ id: string; name: string; color: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<Filters>({
    teamId: "all",
    clientId: "all",
    statusFilter: "all",
    titleSearch: "",
  });

  const fetchTeams = useCallback(async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from("teams")
      .select("id, name, color")
      .eq("company_id", activeCompany.company_id)
      .order("name");
    if (data) setTeams(data);
  }, [activeCompany]);

  const fetchClients = useCallback(async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", activeCompany.company_id)
      .order("name");
    if (data) setClients(data);
  }, [activeCompany]);

  const fetchHistorias = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);

    try {
      let query = supabase
        .from("tasks")
        .select(`
          id, title, description, status, priority, deadline, due_date, start_date,
          team_id, related_client_id, responsible_name, responsible_avatar,
          created_at, updated_at, completed_at, progress
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("task_type", "História")
        .is("parent_task_id", null);

      if (filters.teamId !== "all") {
        query = query.eq("team_id", filters.teamId);
      }

      if (filters.clientId !== "all") {
        query = query.eq("related_client_id", filters.clientId);
      }

      if (filters.statusFilter === "open") {
        query = query.not("status", "in", '("done","progress")');
      } else if (filters.statusFilter === "in_progress") {
        query = query.eq("status", "progress");
      } else if (filters.statusFilter === "done") {
        query = query.eq("status", "done");
      }

      if (filters.titleSearch.trim()) {
        query = query.ilike("title", `%${filters.titleSearch.trim()}%`);
      }

      const { data: historiasData, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      if (!historiasData || historiasData.length === 0) {
        setHistorias([]);
        setLoading(false);
        return;
      }

      const historiaIds = historiasData.map((h: unknown) => h.id);
      const teamIds = [...new Set(historiasData.map((h: unknown) => h.team_id).filter(Boolean))];
      const clientIds = [...new Set(historiasData.map((h: unknown) => h.related_client_id).filter(Boolean))];

      // Fetch subtasks, teams, clients, and work time in parallel
      const [subtasksRes, teamsRes, clientsRes, workTimeDirectRes, workTimeSubsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, priority, responsible_name, deadline, parent_task_id")
          .in("parent_task_id", historiaIds)
          .eq("company_id", activeCompany.company_id),
        teamIds.length > 0
          ? supabase.from("teams").select("id, name, color").in("id", teamIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from("clients").select("id, name, avatar").in("id", clientIds)
          : Promise.resolve({ data: [] }),
        // Direct work time on parent tasks
        supabase
          .from("task_time_tracking")
          .select("task_id, duration_minutes")
          .in("task_id", historiaIds),
        // Work time on subtasks - fetch subtask IDs first then their time
        supabase
          .from("tasks")
          .select("id, parent_task_id")
          .in("parent_task_id", historiaIds)
          .eq("company_id", activeCompany.company_id),
      ]);

      // Now fetch time tracking for subtasks
      const subtaskIds = (workTimeSubsRes.data || []).map((s: unknown) => s.id);
      const subtaskTimeMap: Record<string, number> = {};

      if (subtaskIds.length > 0) {
        const { data: subtaskTimeData } = await supabase
          .from("task_time_tracking")
          .select("task_id, duration_minutes")
          .in("task_id", subtaskIds);

        // Map subtask time to parent
        const subtaskToParent: Record<string, string> = {};
        (workTimeSubsRes.data || []).forEach((s: unknown) => {
          subtaskToParent[s.id] = s.parent_task_id;
        });

        (subtaskTimeData || []).forEach((t: unknown) => {
          const parentId = subtaskToParent[t.task_id];
          if (parentId) {
            subtaskTimeMap[parentId] = (subtaskTimeMap[parentId] || 0) + (t.duration_minutes || 0);
          }
        });
      }

      // Direct time on parent
      const directTimeMap: Record<string, number> = {};
      (workTimeDirectRes.data || []).forEach((t: unknown) => {
        directTimeMap[t.task_id] = (directTimeMap[t.task_id] || 0) + (t.duration_minutes || 0);
      });

      const subtasksByParent: Record<string, Subtask[]> = {};
      (subtasksRes.data || []).forEach((s: unknown) => {
        if (!subtasksByParent[s.parent_task_id]) subtasksByParent[s.parent_task_id] = [];
        subtasksByParent[s.parent_task_id].push(s);
      });

      const teamsMap: Record<string, unknown> = {};
      (teamsRes.data || []).forEach((t: unknown) => { teamsMap[t.id] = t; });

      const clientsMap: Record<string, unknown> = {};
      (clientsRes.data || []).forEach((c: unknown) => { clientsMap[c.id] = c; });

      const mapped: Historia[] = historiasData.map((h: unknown) => {
        const subs = subtasksByParent[h.id] || [];
        const team = teamsMap[h.team_id];
        const client = clientsMap[h.related_client_id];
        return {
          ...h,
          team_name: team?.name || null,
          team_color: team?.color || null,
          client_name: client?.name || null,
          client_logo: client?.avatar || null,
          subtasks_total: subs.length,
          subtasks_done: subs.filter((s) => s.status === "done").length,
          subtasks: subs,
          total_work_minutes: (directTimeMap[h.id] || 0) + (subtaskTimeMap[h.id] || 0),
        };
      });

      setHistorias(mapped);
    } catch (err) {
      console.error("Error fetching historias:", err);
      setHistorias([]);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, filters]);

  useEffect(() => {
    fetchTeams();
    fetchClients();
  }, [fetchTeams, fetchClients]);

  useEffect(() => {
    fetchHistorias();
  }, [fetchHistorias]);

  return {
    historias,
    loading,
    teams,
    clients,
    filters,
    setFilters,
    refetch: fetchHistorias,
  };
}
