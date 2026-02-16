import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  user_id: string;
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
  leader_id?: string | null;
  whatsapp_responsible_id?: string | null;
  authorizer_id?: string | null;
  members?: TeamMember[];
  leader?: TeamMember | null;
  whatsapp_responsible?: TeamMember | null;
  authorizer?: TeamMember | null;
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
      
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        return;
      }

      // Fetch all employees for this company to get members
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, user_id, name, email, role, avatar, team_id")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "active");

      if (employeesError) throw employeesError;

      // Map teams with their members
      const teamsWithMembers = teamsData.map((team) => {
        const teamMembers = (employees || [])
          .filter((emp) => emp.team_id === team.id)
          .map((emp) => ({
            id: emp.id,
            user_id: emp.user_id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            avatar: emp.avatar,
          }));

        const leader = teamMembers.find((m) => m.id === team.leader_id) || null;
        const whatsappResponsible = teamMembers.find((m) => m.id === team.whatsapp_responsible_id) || null;
        const authorizer = teamMembers.find((m) => m.id === team.authorizer_id) || null;

        return {
          ...team,
          members: teamMembers,
          leader,
          whatsapp_responsible: whatsappResponsible,
          authorizer,
        };
      });

      setTeams(teamsWithMembers);
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