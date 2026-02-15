import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSkills, Skill } from "@/hooks/useSkills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Plus, Pencil, Zap, Database, Image, MessageSquare,
  BarChart3, FileText, Brain, Puzzle, Power, PowerOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const categoryIcons: Record<string, React.ElementType> = {
  data: Database,
  action: Zap,
  generation: Image,
  communication: MessageSquare,
  analysis: BarChart3,
  content: FileText,
};

export default function SkillsPage() {
  const { skills, skillsByCategory, loading } = useSkills();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadCounts = async () => {
      const { data } = await supabase
        .from("ia_agent_enabled_skills")
        .select("skill_id");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          counts[row.skill_id] = (counts[row.skill_id] || 0) + 1;
        });
        setAgentCounts(counts);
      }
    };
    loadCounts();
  }, []);

  const categories = Object.keys(skillsByCategory).sort();

  const filteredSkills = skills.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const grouped = filteredSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout>
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fábrica de Skills</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e configure todas as skills disponíveis para os agentes
          </p>
        </div>
        <Button onClick={() => navigate("/ia/skills/new")}>
          <Plus className="h-4 w-4 mr-2" /> Nova Skill
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, ID ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={filterCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterCategory(null)}
          >
            Todas ({skills.length})
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
            >
              {cat} ({skillsByCategory[cat]?.length || 0})
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando skills...</div>
      ) : filteredSkills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma skill encontrada</div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, catSkills]) => {
            const Icon = categoryIcons[category] || Puzzle;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h2>
                  <Badge variant="outline" className="text-xs">{catSkills.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {catSkills.map((skill) => (
                    <Card
                      key={skill.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors group"
                      onClick={() => navigate(`/ia/skills/${skill.id}/edit`)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{skill.name}</h3>
                              {skill.is_active === false && (
                                <PowerOff className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{skill.id}</p>
                          </div>
                          <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          {skill.model && (
                            <Badge variant="secondary" className="text-xs truncate max-w-[180px]">
                              {skill.model}
                            </Badge>
                          )}
                          {agentCounts[skill.id] ? (
                            <Badge variant="outline" className="text-xs">
                              {agentCounts[skill.id]} agente{agentCounts[skill.id] > 1 ? "s" : ""}
                            </Badge>
                          ) : null}
                          {skill.requires_client && (
                            <Badge variant="outline" className="text-xs">Requer cliente</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
      )}
    </div>
    </DashboardLayout>
  );
}
