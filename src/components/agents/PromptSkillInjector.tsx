import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Puzzle, ChevronDown, ChevronUp } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface PromptSkillInjectorProps {
  agentId: string;
  onInsertSkill: (skillTag: string) => void;
}

export function PromptSkillInjector({ agentId, onInsertSkill }: PromptSkillInjectorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: enabled } = await supabase
        .from("ia_agent_enabled_skills")
        .select("skill_id")
        .eq("agent_id", agentId);

      if (!enabled?.length) return;

      const skillIds = enabled.map((e: { skill_id: string }) => e.skill_id);
      const { data: skillsData } = await supabase
        .from("ia_agent_skills")
        .select("id, name, category")
        .in("id", skillIds)
        .order("category, name");

      setSkills((skillsData as Skill[]) || []);
    };
    if (agentId) load();
  }, [agentId]);

  if (skills.length === 0) return null;

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="border rounded-lg bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Puzzle className="w-4 h-4" />
        <span>Inserir Skills no Prompt</span>
        <Badge variant="secondary" className="ml-1 text-[10px] h-5">
          {skills.length}
        </Badge>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Clique em uma skill para inserir <code className="bg-muted px-1 rounded">{"{nome_da_skill}"}</code> no prompt.
          </p>
          {Object.entries(grouped).map(([category, catSkills]) => (
            <div key={category}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {category}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {catSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onInsertSkill(`{${skill.id}}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                    title={`Inserir {${skill.id}} no prompt`}
                  >
                    <Puzzle className="w-3 h-3 text-primary" />
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
