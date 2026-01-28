import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bot, Briefcase, Target, Volume2, Heart, Sparkles, Smile } from "lucide-react";

interface IdentityPanelProps {
  config: {
    agent_name: string;
    department: string;
    primary_objective: string;
    formality_level: number;
    empathy_level: number;
    enthusiasm_level: number;
    emoji_usage: "none" | "moderate" | "intense";
  };
  onChange: (field: string, value: any) => void;
}

const departments = [
  { value: "atendimento_geral", label: "Atendimento Geral" },
  { value: "suporte_tecnico", label: "Suporte Técnico" },
  { value: "vendas", label: "Vendas" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "financeiro", label: "Financeiro" },
];

const objectives = [
  { value: "resolver_duvida", label: "Resolver Dúvida" },
  { value: "agendar_reuniao", label: "Agendar Reunião" },
  { value: "acalmar_cliente", label: "Acalmar Cliente" },
  { value: "vender", label: "Vender/Persuadir" },
  { value: "informar", label: "Apenas Informar" },
  { value: "qualificar_lead", label: "Qualificar Lead" },
];

export function WhatsAppAIAgentIdentityPanel({ config, onChange }: IdentityPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Identidade e Função</h3>
      </div>

      {/* Nome do Agente */}
      <div className="space-y-2">
        <Label htmlFor="agent_name" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Nome do Agente
        </Label>
        <Input
          id="agent_name"
          value={config.agent_name}
          onChange={(e) => onChange("agent_name", e.target.value)}
          placeholder="Ex: Assistente, Ana, Suporte..."
        />
        <p className="text-xs text-muted-foreground">
          Como o agente se apresentará nas conversas
        </p>
      </div>

      {/* Departamento */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Departamento/Persona
        </Label>
        <Select value={config.department} onValueChange={(v) => onChange("department", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Objetivo Primário */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Objetivo Primário
        </Label>
        <Select value={config.primary_objective} onValueChange={(v) => onChange("primary_objective", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {objectives.map((obj) => (
              <SelectItem key={obj.value} value={obj.value}>
                {obj.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 pt-4 pb-2 border-b">
        <Volume2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Tom e Voz</h3>
      </div>

      {/* Slider: Formalidade */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <span className="text-sm">Formalidade</span>
          </Label>
          <span className="text-xs text-muted-foreground">{config.formality_level}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-14">Casual</span>
          <Slider
            value={[config.formality_level]}
            onValueChange={([v]) => onChange("formality_level", v)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-14 text-right">Formal</span>
        </div>
      </div>

      {/* Slider: Empatia */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="text-sm">Empatia</span>
          </Label>
          <span className="text-xs text-muted-foreground">{config.empathy_level}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-14">Objetiva</span>
          <Slider
            value={[config.empathy_level]}
            onValueChange={([v]) => onChange("empathy_level", v)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-14 text-right">Empática</span>
        </div>
      </div>

      {/* Slider: Entusiasmo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Entusiasmo</span>
          </Label>
          <span className="text-xs text-muted-foreground">{config.enthusiasm_level}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-14">Calmo</span>
          <Slider
            value={[config.enthusiasm_level]}
            onValueChange={([v]) => onChange("enthusiasm_level", v)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-14 text-right">Energético</span>
        </div>
      </div>

      {/* Radio: Uso de Emojis */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Smile className="h-4 w-4" />
          Uso de Emojis
        </Label>
        <RadioGroup
          value={config.emoji_usage}
          onValueChange={(v) => onChange("emoji_usage", v)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="emoji_none" />
            <Label htmlFor="emoji_none" className="text-sm font-normal cursor-pointer">
              Nenhum
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="moderate" id="emoji_moderate" />
            <Label htmlFor="emoji_moderate" className="text-sm font-normal cursor-pointer">
              Moderado
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="intense" id="emoji_intense" />
            <Label htmlFor="emoji_intense" className="text-sm font-normal cursor-pointer">
              Intenso
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
