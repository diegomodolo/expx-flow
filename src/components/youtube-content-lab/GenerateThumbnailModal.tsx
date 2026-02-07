import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateThumbnailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generating: boolean;
  error?: string | null;
}

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export function GenerateThumbnailModal({
  open,
  onOpenChange,
  generating,
  error,
}: GenerateThumbnailModalProps) {
  const [steps, setSteps] = useState<Step[]>([
    { id: 'collect', label: 'Coletando informações do roteiro', status: 'pending' },
    { id: 'analyze', label: 'Analisando fotos do modelo', status: 'pending' },
    { id: 'references', label: 'Processando referências visuais', status: 'pending' },
    { id: 'generate', label: 'Gerando imagem com IA', status: 'pending' },
  ]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!generating) {
      if (error) {
        setSteps(prev => prev.map(s => 
          s.status === 'processing' ? { ...s, status: 'error' } : s
        ));
      }
      return;
    }

    // Simulate progress through steps
    const stepDuration = 2000;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSteps(prev => prev.map((s, i) => {
          if (i < currentStep) return { ...s, status: 'done' };
          if (i === currentStep) return { ...s, status: 'processing' };
          return s;
        }));
        setProgress(((currentStep + 1) / steps.length) * 100);
        currentStep++;
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [generating, error]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSteps([
        { id: 'collect', label: 'Coletando informações do roteiro', status: 'pending' },
        { id: 'analyze', label: 'Analisando fotos do modelo', status: 'pending' },
        { id: 'references', label: 'Processando referências visuais', status: 'pending' },
        { id: 'generate', label: 'Gerando imagem com IA', status: 'pending' },
      ]);
      setProgress(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {error ? 'Erro ao gerar thumbnail' : 'Gerando Thumbnail...'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 text-sm",
                  step.status === 'pending' && "text-muted-foreground",
                  step.status === 'processing' && "text-primary font-medium",
                  step.status === 'done' && "text-green-600 dark:text-green-400",
                  step.status === 'error' && "text-destructive"
                )}
              >
                {step.status === 'pending' && (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                {step.status === 'processing' && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {step.status === 'done' && (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {!error && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% concluído
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
