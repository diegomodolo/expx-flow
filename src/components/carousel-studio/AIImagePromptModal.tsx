import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Prompt base montado pelo sistema (somente leitura, para referência) */
  basePrompt: string;
  /** Chamado ao confirmar; recebe o prompt extra digitado pelo usuário */
  onConfirm: (extraPrompt: string) => void;
  isGenerating?: boolean;
}

export function AIImagePromptModal({
  open,
  onOpenChange,
  basePrompt,
  onConfirm,
  isGenerating = false,
}: Props) {
  const [extra, setExtra] = useState("");

  const handleConfirm = () => {
    onConfirm(extra.trim());
    setExtra("");
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setExtra("");
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Gerar Imagem com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt base — só leitura */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Prompt base (gerado automaticamente)
            </Label>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
              {basePrompt || "(sem contexto de slide ainda)"}
            </div>
          </div>

          {/* Prompt extra do usuário */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Personalizar prompt <span className="opacity-60">(opcional)</span>
            </Label>
            <Textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Ex: tons quentes, luz solar dourada, estilo editorial, sem pessoas..."
              className="min-h-[80px] text-sm resize-none"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Seu texto será adicionado ao prompt base antes de enviar para a
              IA.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isGenerating}>
            <Sparkles className="w-3 h-3 mr-1" />
            {isGenerating ? "Gerando..." : "Gerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
