import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, Check, X } from "lucide-react";

interface CreativeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => Promise<void>;
  onComplete?: () => void;
}

export function CreativeGenerationModal({
  open,
  onOpenChange,
  onGenerate,
  onComplete,
}: CreativeGenerationModalProps) {
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ index: number; success: boolean; error?: string }[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResults([]);
    setCurrentIndex(0);

    for (let i = 0; i < count; i++) {
      setCurrentIndex(i + 1);
      try {
        await onGenerate();
        setResults((prev) => [...prev, { index: i + 1, success: true }]);
      } catch (error: any) {
        setResults((prev) => [...prev, { index: i + 1, success: false, error: error.message }]);
      }
    }

    setIsGenerating(false);
    onComplete?.();
  };

  const handleClose = () => {
    if (!isGenerating) {
      setCount(1);
      setCurrentIndex(0);
      setResults([]);
      onOpenChange(false);
    }
  };

  const progress = (results.length / count) * 100;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isGenerating ? "Gerando Criativos" : "Gerar Criativos"}
          </DialogTitle>
          <DialogDescription>
            {isGenerating
              ? `Gerando criativo ${currentIndex} de ${count}...`
              : "Selecione quantos criativos você deseja gerar."}
          </DialogDescription>
        </DialogHeader>

        {!isGenerating && results.length === 0 ? (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quantidade:</span>
                <span className="text-2xl font-bold text-primary">{count}</span>
              </div>
              <Slider
                value={[count]}
                onValueChange={(value) => setCount(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-center text-muted-foreground">
              {results.length} de {count} concluídos
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {results.map((result) => (
                <div
                  key={result.index}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    result.success
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {result.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span>
                    Criativo {result.index}:{" "}
                    {result.success ? "Gerado com sucesso" : result.error || "Erro"}
                  </span>
                </div>
              ))}
              {isGenerating && currentIndex <= count && (
                <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-primary/10 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gerando criativo {currentIndex}...</span>
                </div>
              )}
            </div>

            {!isGenerating && results.length > 0 && (
              <div className="text-center text-sm">
                <span className="text-green-600">{successCount} gerados</span>
                {failCount > 0 && (
                  <span className="text-red-600 ml-2">• {failCount} erros</span>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!isGenerating && results.length === 0 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar {count} {count === 1 ? "Criativo" : "Criativos"}
              </Button>
            </>
          ) : !isGenerating ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
