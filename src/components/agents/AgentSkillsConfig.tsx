import React from "react";
import { useAgentSkills } from "@/hooks/useAgentSkills";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Palette,
  Youtube,
  BarChart3,
  Search,
  Wrench,
  MessageSquare,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  conteudo: { label: "Geração de Conteúdo", icon: Palette, color: "bg-pink-500/10 text-pink-600" },
  youtube: { label: "YouTube", icon: Youtube, color: "bg-red-500/10 text-red-600" },
  campanhas: { label: "Gestão de Campanhas", icon: BarChart3, color: "bg-blue-500/10 text-blue-600" },
  prospeccao: { label: "Prospecção e Leads", icon: Search, color: "bg-green-500/10 text-green-600" },
  utilidades: { label: "Utilidades", icon: Wrench, color: "bg-amber-500/10 text-amber-600" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-600" },
  publicacao: { label: "Publicação", icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
};

interface AgentSkillsConfigProps {
  agentId: string;
  hasClient: boolean;
}

export function AgentSkillsConfig({ agentId, hasClient }: AgentSkillsConfigProps) {
  const {
    skillsByCategory,
    enabledSkillIds,
    loading,
    toggleSkill,
    enableAll,
    disableAll,
    enabledCount,
    totalCount,
  } = useAgentSkills(agentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {enabledCount}/{totalCount} ativas
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={enableAll}>
              <ToggleRight className="w-4 h-4 mr-1" />
              Habilitar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={disableAll}>
              <ToggleLeft className="w-4 h-4 mr-1" />
              Desabilitar Todas
            </Button>
          </div>
        </div>

        {/* Categories */}
        {Object.entries(skillsByCategory).map(([category, skills]) => {
          const config = categoryConfig[category] || {
            label: category,
            icon: Wrench,
            color: "bg-muted text-muted-foreground",
          };
          const Icon = config.icon;
          const enabledInCategory = skills.filter((s) => enabledSkillIds.has(s.id)).length;

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              {/* Category header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
                <div className={`p-1.5 rounded-md ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{config.label}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {enabledInCategory}/{skills.length}
                </Badge>
              </div>

              {/* Skills list */}
              <div className="divide-y">
                {skills.map((skill) => {
                  const isEnabled = enabledSkillIds.has(skill.id);
                  const needsClient = skill.requires_client && !hasClient;

                  return (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{skill.name}</span>
                          {needsClient && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Sem cliente fixo — o agente perguntará o nome do cliente antes de executar
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {skill.description}
                        </p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleSkill(skill.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
