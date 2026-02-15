import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface AgentSquad {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  company_id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; company: string } | null;
  members_count?: number;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  agent_id: string;
  role: "leader" | "manager" | "executor";
  squad_instructions: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
  agent?: {
    id: string;
    agent_name: string;
    description: string | null;
  };
}

export interface SquadFlow {
  id: string;
  squad_id: string;
  source_member_id: string;
  target_member_id: string;
  label: string | null;
  condition: string | null;
}

export function useAgentSquads() {
  const [squads, setSquads] = useState<AgentSquad[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchSquads = async () => {
    if (!activeCompany?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ia_agent_squads" as any)
        .select("*, clients(id, name, company)")
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch member counts
      const squadsData = (data || []) as any[];
      const squadsWithCounts = await Promise.all(
        squadsData.map(async (squad: any) => {
          const { count } = await supabase
            .from("ia_agent_squad_members" as any)
            .select("*", { count: "exact", head: true })
            .eq("squad_id", squad.id);
          return {
            ...squad,
            client: squad.clients,
            members_count: count || 0,
          };
        })
      );

      setSquads(squadsWithCounts);
    } catch (err: any) {
      toast({ title: "Erro ao carregar squads", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createSquad = async (data: { name: string; description?: string; client_id: string }) => {
    if (!activeCompany?.company_id || !user?.id) return null;
    try {
      const { data: squad, error } = await supabase
        .from("ia_agent_squads" as any)
        .insert({
          name: data.name,
          description: data.description || null,
          client_id: data.client_id,
          company_id: activeCompany.company_id,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Squad criada com sucesso!" });
      fetchSquads();
      return squad;
    } catch (err: any) {
      toast({ title: "Erro ao criar squad", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateSquad = async (id: string, data: { name?: string; description?: string; client_id?: string }) => {
    try {
      const { error } = await supabase
        .from("ia_agent_squads" as any)
        .update(data as any)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Squad atualizada!" });
      fetchSquads();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar squad", description: err.message, variant: "destructive" });
    }
  };

  const deleteSquad = async (id: string) => {
    try {
      const { error } = await supabase.from("ia_agent_squads" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Squad excluída!" });
      fetchSquads();
    } catch (err: any) {
      toast({ title: "Erro ao excluir squad", description: err.message, variant: "destructive" });
    }
  };

  const fetchSquadById = async (id: string) => {
    const { data, error } = await supabase
      .from("ia_agent_squads" as any)
      .select("*, clients(id, name, company)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return { ...(data as any), client: (data as any).clients };
  };

  const fetchSquadMembers = async (squadId: string): Promise<SquadMember[]> => {
    const { data, error } = await supabase
      .from("ia_agent_squad_members" as any)
      .select("*, ia_agents(id, agent_name, description)")
      .eq("squad_id", squadId);
    if (error) throw error;
    return ((data || []) as any[]).map((m: any) => ({ ...m, agent: m.ia_agents }));
  };

  const fetchSquadFlows = async (squadId: string): Promise<SquadFlow[]> => {
    const { data, error } = await supabase
      .from("ia_agent_squad_flows" as any)
      .select("*")
      .eq("squad_id", squadId);
    if (error) throw error;
    return (data || []) as any[];
  };

  const saveSquadLayout = async (
    squadId: string,
    members: Array<{ id?: string; agent_id: string; role: string; squad_instructions?: string; position_x: number; position_y: number }>,
    flows: Array<{ source_member_id: string; target_member_id: string; label?: string; condition?: string }>
  ) => {
    try {
      // Delete existing flows first (they reference members), then members
      const { error: delFlowsErr } = await supabase.from("ia_agent_squad_flows" as any).delete().eq("squad_id", squadId);
      if (delFlowsErr) {
        console.error("Error deleting flows:", delFlowsErr);
        throw delFlowsErr;
      }
      
      const { error: delMembersErr } = await supabase.from("ia_agent_squad_members" as any).delete().eq("squad_id", squadId);
      if (delMembersErr) {
        console.error("Error deleting members:", delMembersErr);
        throw delMembersErr;
      }

      // Insert members
      if (members.length > 0) {
        const { data: insertedMembers, error: membersError } = await supabase
          .from("ia_agent_squad_members" as any)
          .insert(
            members.map((m) => ({
              squad_id: squadId,
              agent_id: m.agent_id,
              role: m.role,
              squad_instructions: m.squad_instructions || null,
              position_x: m.position_x,
              position_y: m.position_y,
            })) as any
          )
          .select();

        if (membersError) throw membersError;

        // Build id mapping (old temp ids to new DB ids)
        const membersList = insertedMembers as any[];
        
        // Insert flows using the new member IDs
        if (flows.length > 0 && membersList.length > 0) {
          // Map: we need to match source/target by agent_id + position
          const memberMap = new Map<string, string>();
          members.forEach((m, i) => {
            const key = m.id || `${m.agent_id}-${m.position_x}-${m.position_y}`;
            if (membersList[i]) {
              memberMap.set(key, membersList[i].id);
            }
          });

          const flowInserts = flows
            .map((f) => ({
              squad_id: squadId,
              source_member_id: memberMap.get(f.source_member_id) || f.source_member_id,
              target_member_id: memberMap.get(f.target_member_id) || f.target_member_id,
              label: f.label || null,
              condition: f.condition || null,
            }))
            .filter((f) => f.source_member_id && f.target_member_id);

          if (flowInserts.length > 0) {
            const { error: flowsError } = await supabase
              .from("ia_agent_squad_flows" as any)
              .insert(flowInserts as any);
            if (flowsError) throw flowsError;
          }
        }
      }

      toast({ title: "Squad salva com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar squad", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) fetchSquads();
  }, [activeCompany?.company_id]);

  return {
    squads,
    loading,
    fetchSquads,
    createSquad,
    updateSquad,
    deleteSquad,
    fetchSquadById,
    fetchSquadMembers,
    fetchSquadFlows,
    saveSquadLayout,
  };
}
