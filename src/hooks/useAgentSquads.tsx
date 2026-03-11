import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchSquadsQuery = useQuery({
    queryKey: ["agent_squads", activeCompany?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_agent_squads" as unknown)
        .select("*, clients(id, name, company)")
        .eq("company_id", activeCompany!.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const squadsData = (data || []) as unknown[];
      const squadsWithCounts = await Promise.all(
        squadsData.map(async (squad: unknown) => {
          const typedSquad = squad as AgentSquad & {
            clients?: AgentSquad["client"];
          };
          const { count } = await supabase
            .from("ia_agent_squad_members" as unknown)
            .select("*", { count: "exact", head: true })
            .eq("squad_id", typedSquad.id);
          return {
            ...typedSquad,
            client: typedSquad.clients,
            members_count: count || 0,
          } as AgentSquad;
        }),
      );

      return squadsWithCounts;
    },
    enabled: !!activeCompany?.company_id,
  });

  const createSquadMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      client_id: string;
    }) => {
      if (!activeCompany?.company_id || !user?.id)
        throw new Error("Missing company or user");
      const { data: squad, error } = await supabase
        .from("ia_agent_squads" as unknown)
        .insert({
          name: data.name,
          description: data.description || null,
          client_id: data.client_id,
          company_id: activeCompany.company_id,
          user_id: user.id,
        } as unknown)
        .select()
        .single();

      if (error) throw error;
      return squad;
    },
    onSuccess: () => {
      toast({ title: "Squad criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["agent_squads"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao criar squad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateSquadMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; client_id?: string };
    }) => {
      const { error } = await supabase
        .from("ia_agent_squads" as unknown)
        .update(data as unknown)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Squad atualizada!" });
      queryClient.invalidateQueries({ queryKey: ["agent_squads"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar squad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteSquadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ia_agent_squads" as unknown)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Squad excluída!" });
      queryClient.invalidateQueries({ queryKey: ["agent_squads"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao excluir squad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const saveSquadLayoutMutation = useMutation({
    mutationFn: async ({
      squadId,
      members,
      flows,
    }: {
      squadId: string;
      members: Array<{
        id?: string;
        agent_id: string;
        role: string;
        squad_instructions?: string;
        position_x: number;
        position_y: number;
      }>;
      flows: Array<{
        source_member_id: string;
        target_member_id: string;
        label?: string;
        condition?: string;
      }>;
    }) => {
      const { error: delFlowsErr } = await supabase
        .from("ia_agent_squad_flows" as unknown)
        .delete()
        .eq("squad_id", squadId);
      if (delFlowsErr) throw delFlowsErr;

      const { error: delMembersErr } = await supabase
        .from("ia_agent_squad_members" as unknown)
        .delete()
        .eq("squad_id", squadId);
      if (delMembersErr) throw delMembersErr;

      if (members.length > 0) {
        const { data: insertedMembers, error: membersError } = await supabase
          .from("ia_agent_squad_members" as unknown)
          .insert(
            members.map((m) => ({
              squad_id: squadId,
              agent_id: m.agent_id,
              role: m.role,
              squad_instructions: m.squad_instructions || null,
              position_x: m.position_x,
              position_y: m.position_y,
            })) as unknown,
          )
          .select();

        if (membersError) throw membersError;

        const membersList = insertedMembers as unknown[];

        if (flows.length > 0 && membersList.length > 0) {
          const memberMap = new Map<string, string>();
          members.forEach((m, i) => {
            const key = m.id || `${m.agent_id}-${m.position_x}-${m.position_y}`;
            if (membersList[i]) {
              memberMap.set(key, (membersList[i] as { id: string }).id);
            }
          });

          const flowInserts = flows
            .map((f) => ({
              squad_id: squadId,
              source_member_id:
                memberMap.get(f.source_member_id) || f.source_member_id,
              target_member_id:
                memberMap.get(f.target_member_id) || f.target_member_id,
              label: f.label || null,
              condition: f.condition || null,
            }))
            .filter((f) => f.source_member_id && f.target_member_id);

          if (flowInserts.length > 0) {
            const { error: flowsError } = await supabase
              .from("ia_agent_squad_flows" as unknown)
              .insert(flowInserts as unknown);
            if (flowsError) throw flowsError;
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Squad salva com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["agent_squads"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao salvar squad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const fetchSquadById = async (id: string) => {
    const { data, error } = await supabase
      .from("ia_agent_squads" as unknown)
      .select("*, clients(id, name, company)")
      .eq("id", id)
      .single();
    if (error) throw error;
    const typedData = data as unknown as AgentSquad & {
      clients?: AgentSquad["client"];
    };
    return { ...typedData, client: typedData.clients };
  };

  const fetchSquadMembers = async (squadId: string): Promise<SquadMember[]> => {
    const { data, error } = await supabase
      .from("ia_agent_squad_members" as unknown)
      .select("*, ia_agents(id, agent_name, description)")
      .eq("squad_id", squadId);
    if (error) throw error;
    return ((data || []) as unknown[]).map((m: unknown) => {
      const typedM = m as SquadMember & { ia_agents?: SquadMember["agent"] };
      return { ...typedM, agent: typedM.ia_agents };
    });
  };

  const fetchSquadFlows = async (squadId: string): Promise<SquadFlow[]> => {
    const { data, error } = await supabase
      .from("ia_agent_squad_flows" as unknown)
      .select("*")
      .eq("squad_id", squadId);
    if (error) throw error;
    return (data || []) as unknown[];
  };

  return {
    squads: fetchSquadsQuery.data || [],
    loading: fetchSquadsQuery.isLoading,
    fetchSquads: fetchSquadsQuery.refetch,
    createSquad: async (data: {
      name: string;
      description?: string;
      client_id: string;
    }) => {
      return createSquadMutation.mutateAsync(data).catch(() => null);
    },
    updateSquad: async (
      id: string,
      data: { name?: string; description?: string; client_id?: string },
    ) => {
      return updateSquadMutation.mutateAsync({ id, data }).catch(() => {});
    },
    deleteSquad: async (id: string) => {
      return deleteSquadMutation.mutateAsync(id).catch(() => {});
    },
    fetchSquadById,
    fetchSquadMembers,
    fetchSquadFlows,
    saveSquadLayout: async (
      squadId: string,
      members: Array<{
        id?: string;
        agent_id: string;
        role: string;
        squad_instructions?: string;
        position_x: number;
        position_y: number;
      }>,
      flows: Array<{
        source_member_id: string;
        target_member_id: string;
        label?: string;
        condition?: string;
      }>,
    ) => {
      return saveSquadLayoutMutation.mutateAsync({ squadId, members, flows });
    },
  };
}
