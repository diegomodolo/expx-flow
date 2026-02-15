import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  edge_function: string;
  requires_client: boolean | null;
  tool_parameters: Record<string, unknown> | null;
  required_params: Record<string, unknown> | null;
  optional_params: Record<string, unknown> | null;
  created_at: string | null;
  model: string | null;
  system_prompt: string | null;
  temperature: number | null;
  max_tokens: number | null;
  config: Record<string, unknown> | null;
  is_active: boolean | null;
  updated_at: string | null;
  edge_function_code: string | null;
  external_api_config: Record<string, unknown> | null;
  skill_type: string;
  output_parameters: Record<string, unknown> | null;
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ia_agent_skills")
        .select("*")
        .order("category, name");
      if (error) throw error;
      setSkills((data as unknown as Skill[]) || []);
    } catch (err: any) {
      console.error("Error loading skills:", err);
      toast.error("Erro ao carregar skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const getSkill = useCallback(async (id: string): Promise<Skill | null> => {
    const { data, error } = await supabase
      .from("ia_agent_skills")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      toast.error("Skill não encontrada");
      return null;
    }
    return data as unknown as Skill;
  }, []);

  const saveSkill = async (skill: Partial<Skill> & { id: string }) => {
    const { id, ...rest } = skill;
    // Check if skill exists
    const { data: existing } = await supabase
      .from("ia_agent_skills")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("ia_agent_skills")
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Skill atualizada");
    } else {
      const { error } = await supabase
        .from("ia_agent_skills")
        .insert({ id, ...rest } as any);
      if (error) throw error;
      toast.success("Skill criada");
    }
    await loadSkills();
  };

  const deleteSkill = async (id: string) => {
    const { error } = await supabase
      .from("ia_agent_skills")
      .delete()
      .eq("id", id);
    if (error) throw error;
    toast.success("Skill removida");
    await loadSkills();
  };

  const getAgentCountForSkill = useCallback(async (skillId: string): Promise<number> => {
    const { count } = await supabase
      .from("ia_agent_enabled_skills")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillId);
    return count || 0;
  }, []);

  const skillsByCategory = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  return {
    skills,
    skillsByCategory,
    loading,
    loadSkills,
    getSkill,
    saveSkill,
    deleteSkill,
    getAgentCountForSkill,
  };
}
