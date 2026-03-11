import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  edge_function: string;
  requires_client: boolean;
  tool_parameters: Record<string, unknown>;
}

export function useAgentSkills(agentId: string) {
  const queryClient = useQueryClient();

  const queryKey = ["agent_skills", agentId];

  const { data, isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [{ data: skills }, { data: enabled }] = await Promise.all([
        supabase.from("ia_agent_skills").select("*").order("category, name"),
        supabase
          .from("ia_agent_enabled_skills")
          .select("skill_id")
          .eq("agent_id", agentId),
      ]);

      const allSkills = (skills as AgentSkill[]) || [];
      const enabledSkillIds = new Set(
        (enabled || []).map((e: { skill_id: string }) => e.skill_id),
      );

      return { allSkills, enabledSkillIds };
    },
    enabled: !!agentId,
  });

  const allSkills = data?.allSkills || [];
  const enabledSkillIds = data?.enabledSkillIds || new Set<string>();

  const toggleSkillMutation = useMutation({
    mutationFn: async ({
      skillId,
      enabled,
    }: {
      skillId: string;
      enabled: boolean;
    }) => {
      if (enabled) {
        const skill = allSkills.find((s) => s.id === skillId);
        const autoEnableIds: string[] = [skillId];

        if (skill?.requires_client) {
          for (const depId of ["data_clients", "data_client_details"]) {
            if (!enabledSkillIds.has(depId) && !autoEnableIds.includes(depId)) {
              autoEnableIds.push(depId);
            }
          }
        }

        const { error } = await supabase
          .from("ia_agent_enabled_skills")
          .insert(
            autoEnableIds.map((id) => ({ agent_id: agentId, skill_id: id })),
          );
        if (error) throw error;

        return { autoEnabled: autoEnableIds.length > 1 };
      } else {
        const { error } = await supabase
          .from("ia_agent_enabled_skills")
          .delete()
          .eq("agent_id", agentId)
          .eq("skill_id", skillId);
        if (error) throw error;
        return { autoEnabled: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      if (result.autoEnabled) {
        toast.info("Skills de dados de cliente habilitadas automaticamente");
      }
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar skill: " + err.message);
    },
  });

  const enableAllMutation = useMutation({
    mutationFn: async () => {
      const toEnable = allSkills.filter((s) => !enabledSkillIds.has(s.id));
      if (!toEnable.length) return false;
      const { error } = await supabase
        .from("ia_agent_enabled_skills")
        .insert(toEnable.map((s) => ({ agent_id: agentId, skill_id: s.id })));
      if (error) throw error;
      return true;
    },
    onSuccess: (didUpdate) => {
      if (didUpdate) {
        queryClient.invalidateQueries({ queryKey });
        toast.success("Todas as skills habilitadas");
      }
    },
    onError: () => {
      toast.error("Erro ao habilitar skills");
    },
  });

  const disableAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ia_agent_enabled_skills")
        .delete()
        .eq("agent_id", agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Todas as skills desabilitadas");
    },
    onError: () => {
      toast.error("Erro ao desabilitar skills");
    },
  });

  const skillsByCategory = allSkills.reduce<Record<string, AgentSkill[]>>(
    (acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    },
    {},
  );

  return {
    allSkills,
    enabledSkillIds,
    skillsByCategory,
    loading,
    toggleSkill: async (skillId: string, enabled: boolean) =>
      toggleSkillMutation.mutateAsync({ skillId, enabled }).catch(() => {}),
    enableAll: async () => enableAllMutation.mutateAsync().catch(() => {}),
    disableAll: async () => disableAllMutation.mutateAsync().catch(() => {}),
    enabledCount: enabledSkillIds.size,
    totalCount: allSkills.length,
  };
}
