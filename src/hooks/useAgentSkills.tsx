import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [allSkills, setAllSkills] = useState<AgentSkill[]>([]);
  const [enabledSkillIds, setEnabledSkillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: skills }, { data: enabled }] = await Promise.all([
        supabase.from("ia_agent_skills").select("*").order("category, name"),
        supabase.from("ia_agent_enabled_skills").select("skill_id").eq("agent_id", agentId),
      ]);

      setAllSkills((skills as AgentSkill[]) || []);
      setEnabledSkillIds(new Set((enabled || []).map((e: { skill_id: string }) => e.skill_id)));
    } catch (err) {
      console.error("Error loading skills:", err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) loadSkills();
  }, [agentId, loadSkills]);

  const toggleSkill = async (skillId: string, enabled: boolean) => {
    try {
      if (enabled) {
        // Auto-enable data_clients and data_client_details when enabling a requires_client skill
        const skill = allSkills.find(s => s.id === skillId);
        const autoEnableIds: string[] = [skillId];
        
        if (skill?.requires_client) {
          for (const depId of ['data_clients', 'data_client_details']) {
            if (!enabledSkillIds.has(depId) && !autoEnableIds.includes(depId)) {
              autoEnableIds.push(depId);
            }
          }
        }

        const { error } = await supabase
          .from("ia_agent_enabled_skills")
          .insert(autoEnableIds.map(id => ({ agent_id: agentId, skill_id: id })));
        if (error) throw error;
        setEnabledSkillIds((prev) => new Set([...prev, ...autoEnableIds]));
        
        if (autoEnableIds.length > 1) {
          toast.info("Skills de dados de cliente habilitadas automaticamente");
        }
      } else {
        const { error } = await supabase
          .from("ia_agent_enabled_skills")
          .delete()
          .eq("agent_id", agentId)
          .eq("skill_id", skillId);
        if (error) throw error;
        setEnabledSkillIds((prev) => {
          const next = new Set(prev);
          next.delete(skillId);
          return next;
        });
      }
    } catch (err: any) {
      toast.error("Erro ao atualizar skill: " + err.message);
    }
  };

  const enableAll = async () => {
    const toEnable = allSkills.filter((s) => !enabledSkillIds.has(s.id));
    if (!toEnable.length) return;
    const { error } = await supabase
      .from("ia_agent_enabled_skills")
      .insert(toEnable.map((s) => ({ agent_id: agentId, skill_id: s.id })));
    if (error) {
      toast.error("Erro ao habilitar skills");
      return;
    }
    setEnabledSkillIds(new Set(allSkills.map((s) => s.id)));
    toast.success("Todas as skills habilitadas");
  };

  const disableAll = async () => {
    const { error } = await supabase
      .from("ia_agent_enabled_skills")
      .delete()
      .eq("agent_id", agentId);
    if (error) {
      toast.error("Erro ao desabilitar skills");
      return;
    }
    setEnabledSkillIds(new Set());
    toast.success("Todas as skills desabilitadas");
  };

  const skillsByCategory = allSkills.reduce<Record<string, AgentSkill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  return {
    allSkills,
    enabledSkillIds,
    skillsByCategory,
    loading,
    toggleSkill,
    enableAll,
    disableAll,
    enabledCount: enabledSkillIds.size,
    totalCount: allSkills.length,
  };
}
