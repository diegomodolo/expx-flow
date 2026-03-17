import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

interface NewScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generating: boolean;
  onGenerate: (
    topic: string,
    options?: {
      sourceContent?: string;
      durationTarget?: number;
    },
  ) => void;
}

export function NewScriptDialog({
  open,
  onOpenChange,
  generating,
  onGenerate,
}: NewScriptDialogProps) {
  const [topic, setTopic] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);

  const handleGenerate = () => {
    const effectiveTopic = topic.trim() || "Novo roteiro";
    onGenerate(effectiveTopic, {
      sourceContent: sourceContent.trim() || undefined,
      durationTarget: durationMinutes * 60,
    });
    setTopic("");
    setSourceContent("");
    setDurationMinutes(10);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Roteiro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="topic">Tema / Título do vídeo</Label>
            <Input
              id="topic"
              placeholder="Ex: Como aumentar vendas com tráfego pago"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceContent">
              Conteúdo base{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="sourceContent"
              placeholder="Cole aqui o conteúdo sobre o qual deseja criar o roteiro. Pode ser um artigo, anotações, transcrição, briefing, ou qualquer texto de referência..."
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              className="min-h-[180px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              A IA usará este conteúdo como base para criar o roteiro do vídeo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração alvo (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={120}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(parseInt(e.target.value) || 10)
              }
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
          >
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Roteiro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
