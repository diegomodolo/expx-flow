import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Brain, User, ShieldAlert, AlertTriangle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

interface KnowledgePanelProps {
  config: {
    use_purchase_history: boolean;
    use_client_name: boolean;
    use_satisfaction_score: boolean;
    use_conversation_history: boolean;
    blacklist_words: string[];
    min_confidence_threshold: number;
    escalation_message: string;
  };
  onChange: (field: string, value: any) => void;
}

export function WhatsAppAIAgentKnowledgePanel({ config, onChange }: KnowledgePanelProps) {
  const [newBlacklistWord, setNewBlacklistWord] = useState("");

  const addBlacklistWord = () => {
    if (newBlacklistWord.trim() && !config.blacklist_words.includes(newBlacklistWord.trim())) {
      onChange("blacklist_words", [...config.blacklist_words, newBlacklistWord.trim()]);
      setNewBlacklistWord("");
    }
  };

  const removeBlacklistWord = (word: string) => {
    onChange("blacklist_words", config.blacklist_words.filter((w) => w !== word));
  };

  return (
    <div className="space-y-6">
      {/* Contexto do Cliente */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Contexto do Cliente</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quais informações do cliente o agente deve considerar ao formular respostas
        </p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_client_name"
              checked={config.use_client_name}
              onCheckedChange={(v) => onChange("use_client_name", v)}
            />
            <Label htmlFor="use_client_name" className="text-sm font-normal cursor-pointer">
              Usar nome do cliente na resposta
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_conversation_history"
              checked={config.use_conversation_history}
              onCheckedChange={(v) => onChange("use_conversation_history", v)}
            />
            <Label htmlFor="use_conversation_history" className="text-sm font-normal cursor-pointer">
              Considerar histórico da conversa
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_purchase_history"
              checked={config.use_purchase_history}
              onCheckedChange={(v) => onChange("use_purchase_history", v)}
            />
            <Label htmlFor="use_purchase_history" className="text-sm font-normal cursor-pointer">
              Histórico de compras (se disponível)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_satisfaction_score"
              checked={config.use_satisfaction_score}
              onCheckedChange={(v) => onChange("use_satisfaction_score", v)}
            />
            <Label htmlFor="use_satisfaction_score" className="text-sm font-normal cursor-pointer">
              Score de satisfação/NPS (se disponível)
            </Label>
          </div>
        </div>
      </div>

      {/* Guardrails */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Regras e Guardrails</h3>
        </div>

        {/* Blacklist */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Palavras Proibidas
          </Label>
          <p className="text-xs text-muted-foreground">
            O agente nunca usará estas palavras ou frases nas respostas
          </p>
          <div className="flex gap-2">
            <Input
              value={newBlacklistWord}
              onChange={(e) => setNewBlacklistWord(e.target.value)}
              placeholder="Digite uma palavra..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBlacklistWord())}
            />
            <Button type="button" variant="secondary" onClick={addBlacklistWord}>
              Adicionar
            </Button>
          </div>
          {config.blacklist_words.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.blacklist_words.map((word) => (
                <Badge key={word} variant="secondary" className="gap-1">
                  {word}
                  <button
                    type="button"
                    onClick={() => removeBlacklistWord(word)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Limite de Confiança */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm">Limite de Confiança para Transbordo</span>
            </Label>
            <span className="text-xs text-muted-foreground">{config.min_confidence_threshold}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Se a confiança da resposta for menor, sugerir transferência para humano
          </p>
          <Slider
            value={[config.min_confidence_threshold]}
            onValueChange={([v]) => onChange("min_confidence_threshold", v)}
            max={100}
            step={5}
          />
        </div>

        {/* Mensagem de Escalação */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem de Transbordo
          </Label>
          <p className="text-xs text-muted-foreground">
            Mensagem usada quando o agente precisa transferir para um humano
          </p>
          <Textarea
            value={config.escalation_message}
            onChange={(e) => onChange("escalation_message", e.target.value)}
            placeholder="Ex: Vou transferir você para um especialista..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
