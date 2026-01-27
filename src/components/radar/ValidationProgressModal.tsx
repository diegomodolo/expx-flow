import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ValidationStep = 'validating' | 'analyzing' | 'complete';

export interface ValidationProgress {
  step: ValidationStep;
  currentUrl?: string;
  currentClient?: string;
  processedCount: number;
  totalCount: number;
  suspiciousCount?: number;
  errorCount?: number;
}

interface ValidationProgressModalProps {
  isOpen: boolean;
  progress: ValidationProgress;
}

export function ValidationProgressModal({ isOpen, progress }: ValidationProgressModalProps) {
  const progressPercentage = progress.totalCount > 0 
    ? Math.round((progress.processedCount / progress.totalCount) * 100) 
    : 0;

  const getStepIcon = (step: ValidationStep) => {
    switch (step) {
      case 'validating':
        return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      case 'analyzing':
        return <Search className="h-4 w-4 animate-pulse text-primary" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />;
    }
  };

  const getStepLabel = (step: ValidationStep) => {
    switch (step) {
      case 'validating':
        return 'Validando URLs';
      case 'analyzing':
        return 'Analisando Conteúdo';
      case 'complete':
        return 'Concluído';
    }
  };

  const steps: ValidationStep[] = ['validating', 'analyzing', 'complete'];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.step !== 'complete' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
            )}
            {progress.step === 'complete' ? 'Validação Concluída' : 'Validando URLs...'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Steps Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step === progress.step;
              const isComplete = steps.indexOf(progress.step) > index || progress.step === 'complete';
              
              return (
                <div key={step} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive && "bg-primary/10 text-primary",
                    isComplete && !isActive && "bg-green-500/10 text-green-600 dark:text-green-500",
                    !isActive && !isComplete && "bg-muted text-muted-foreground"
                  )}>
                    {isComplete && !isActive ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      getStepIcon(step)
                    )}
                    <span className="hidden sm:inline">{getStepLabel(step)}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      isComplete ? "bg-green-500/50" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {progress.processedCount}/{progress.totalCount} ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Current URL Info */}
          {progress.currentUrl && progress.step !== 'complete' && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {progress.step === 'validating' ? 'Validando' : 'Analisando'}
                </Badge>
                {progress.currentClient && (
                  <span className="text-xs font-medium text-foreground">
                    {progress.currentClient}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate" title={progress.currentUrl}>
                {progress.currentUrl}
              </p>
            </div>
          )}

          {/* Summary Stats (when complete) */}
          {progress.step === 'complete' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{progress.processedCount}</p>
                <p className="text-xs text-muted-foreground">URLs Validadas</p>
              </div>
              {progress.suspiciousCount !== undefined && progress.suspiciousCount > 0 && (
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{progress.suspiciousCount}</p>
                  <p className="text-xs text-muted-foreground">Suspeitas</p>
                </div>
              )}
              {progress.errorCount !== undefined && progress.errorCount > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{progress.errorCount}</p>
                  <p className="text-xs text-muted-foreground">Com Erro</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
