import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_color: string;
  icon_bg: string;
  color: string;
  progress: number;
  active_tasks: number;
  members?: TeamMember[];
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchTeams = async () => {
    if (!user || !activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          members:team_members(*)
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar equipes");
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (teamData: Omit<Team, "id" | "progress" | "active_tasks" | "members">) => {
    if (!user || !activeCompany) {
      setError("Usuário não autenticado ou empresa não selecionada");
      return null;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from("teams")
        .insert([{
          ...teamData,
          user_id: user.id,
          company_id: activeCompany.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchTeams(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar equipe");
      return null;
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const { error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchTeams(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar equipe");
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchTeams(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar equipe");
    }
  };

  const addTeamMember = async (teamId: string, memberData: Omit<TeamMember, "id">) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .insert([{
          ...memberData,
          team_id: teamId,
        }]);

      if (error) throw error;
      await fetchTeams(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      await fetchTeams(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover membro");
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user, activeCompany]);

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
  };
}