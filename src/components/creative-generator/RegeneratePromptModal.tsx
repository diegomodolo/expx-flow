import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Sparkles } from "lucide-react";

interface RegeneratePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (extraPrompt: string) => void;
  isLoading?: boolean;
}

export function RegeneratePromptModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RegeneratePromptModalProps) {
  const [extraPrompt, setExtraPrompt] = useState("");

  const handleConfirm = () => {
    onConfirm(extraPrompt);
    setExtraPrompt("");
  };

  const handleClose = () => {
    if (!isLoading) {
      setExtraPrompt("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Nova Imagem
          </DialogTitle>
          <DialogDescription>
            Adicione instruções extras para personalizar a nova geração. 
            Essas instruções serão combinadas com o prompt original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Ex: Inclua uma foto de um computador moderno, adicione elementos de tecnologia, use cores mais vibrantes..."
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            💡 Dica: Seja específico sobre elementos visuais, objetos, cores ou estilos que deseja na imagem.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar Nova
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
