import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, AlignLeft, Bold, List, Layers, MousePointer } from "lucide-react";

interface FormatPanelProps {
  config: {
    response_length: "short" | "medium" | "long";
    use_bold: boolean;
    use_lists: boolean;
    use_short_paragraphs: boolean;
    mandatory_cta: string | null;
  };
  onChange: (field: string, value: any) => void;
}

export function WhatsAppAIAgentFormatPanel({ config, onChange }: FormatPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Formatação da Resposta</h3>
      </div>

      {/* Tamanho da Resposta */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4" />
          Tamanho da Resposta
        </Label>
        <RadioGroup
          value={config.response_length}
          onValueChange={(v) => onChange("response_length", v)}
          className="grid grid-cols-3 gap-3"
        >
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="short" id="length_short" />
            <div>
              <Label htmlFor="length_short" className="text-sm font-medium cursor-pointer">
                Curta
              </Label>
              <p className="text-xs text-muted-foreground">Estilo tweet</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="medium" id="length_medium" />
            <div>
              <Label htmlFor="length_medium" className="text-sm font-medium cursor-pointer">
                Média
              </Label>
              <p className="text-xs text-muted-foreground">Balanceada</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="long" id="length_long" />
            <div>
              <Label htmlFor="length_long" className="text-sm font-medium cursor-pointer">
                Longa
              </Label>
              <p className="text-xs text-muted-foreground">Detalhada</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Opções de Formatação */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Estilo de Texto
        </Label>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_bold"
              checked={config.use_bold}
              onCheckedChange={(v) => onChange("use_bold", v)}
            />
            <Bold className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="use_bold" className="text-sm font-normal cursor-pointer">
              Usar <strong>negrito</strong> em palavras-chave
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_lists"
              checked={config.use_lists}
              onCheckedChange={(v) => onChange("use_lists", v)}
            />
            <List className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="use_lists" className="text-sm font-normal cursor-pointer">
              Usar listas (bullet points) para instruções
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_short_paragraphs"
              checked={config.use_short_paragraphs}
              onCheckedChange={(v) => onChange("use_short_paragraphs", v)}
            />
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="use_short_paragraphs" className="text-sm font-normal cursor-pointer">
              Quebrar em parágrafos curtos
            </Label>
          </div>
        </div>
      </div>

      {/* CTA Obrigatório */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MousePointer className="h-4 w-4" />
          Chamada para Ação (CTA) Obrigatória
        </Label>
        <p className="text-xs text-muted-foreground">
          Instrução para sempre incluir uma ação ou pergunta no final da resposta
        </p>
        <Textarea
          value={config.mandatory_cta || ""}
          onChange={(e) => onChange("mandatory_cta", e.target.value || null)}
          placeholder="Ex: Sempre terminar com uma pergunta aberta para manter a conversa viva"
          rows={2}
        />
      </div>
    </div>
  );
}
