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
  clientSearch: string;
  statusFilter: "open" | "done" | "all";
  titleSearch: string;
}

export function useHistorias() {
  const { activeCompany } = useCompany();
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{ id: string; name: string; color: string }[]>([]);
  const [filters, setFilters] = useState<Filters>({
    teamId: "all",
    clientSearch: "",
    statusFilter: "all",
    titleSearch: "",
  });

  const fetchTeams = useCallback(async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from("teams")
      .select("id, name, color")
      .eq("company_id", activeCompany.id)
      .order("name");
    if (data) setTeams(data);
  }, [activeCompany]);

  const fetchHistorias = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);

    try {
      // Fetch parent tasks (Histórias)
      let query = supabase
        .from("tasks")
        .select(`
          id, title, description, status, priority, deadline, due_date, start_date,
          team_id, related_client_id, responsible_name, responsible_avatar,
          created_at, updated_at, progress
        `)
        .eq("company_id", activeCompany.id)
        .eq("task_type", "História")
        .is("parent_task_id", null);

      if (filters.teamId !== "all") {
        query = query.eq("team_id", filters.teamId);
      }

      if (filters.statusFilter === "open") {
        query = query.neq("status", "done");
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

      // Fetch subtasks, teams, and clients in parallel
      const historiaIds = historiasData.map((h: any) => h.id);
      const teamIds = [...new Set(historiasData.map((h: any) => h.team_id).filter(Boolean))];
      const clientIds = [...new Set(historiasData.map((h: any) => h.related_client_id).filter(Boolean))];

      const [subtasksRes, teamsRes, clientsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, priority, responsible_name, deadline, parent_task_id")
          .in("parent_task_id", historiaIds)
          .eq("company_id", activeCompany.id),
        teamIds.length > 0
          ? supabase.from("teams").select("id, name, color").in("id", teamIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from("clients").select("id, name, avatar").in("id", clientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const subtasksByParent: Record<string, Subtask[]> = {};
      (subtasksRes.data || []).forEach((s: any) => {
        if (!subtasksByParent[s.parent_task_id]) subtasksByParent[s.parent_task_id] = [];
        subtasksByParent[s.parent_task_id].push(s);
      });

      const teamsMap: Record<string, any> = {};
      (teamsRes.data || []).forEach((t: any) => { teamsMap[t.id] = t; });

      const clientsMap: Record<string, any> = {};
      (clientsRes.data || []).forEach((c: any) => { clientsMap[c.id] = c; });

      let mapped: Historia[] = historiasData.map((h: any) => {
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
        };
      });

      // Client search filter (post-fetch since it's a joined field)
      if (filters.clientSearch.trim()) {
        const search = filters.clientSearch.trim().toLowerCase();
        mapped = mapped.filter((h) => h.client_name?.toLowerCase().includes(search));
      }

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
  }, [fetchTeams]);

  useEffect(() => {
    fetchHistorias();
  }, [fetchHistorias]);

  return {
    historias,
    loading,
    teams,
    filters,
    setFilters,
    refetch: fetchHistorias,
  };
}
