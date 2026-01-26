import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SaveStep } from '@/hooks/useSaveWithProgress';

interface SaveProgressModalProps {
  isOpen: boolean;
  steps: SaveStep[];
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function SaveProgressModal({ 
  isOpen, 
  steps, 
  error, 
  onClose,
  onRetry,
}: SaveProgressModalProps) {
  const isComplete = steps.every(s => s.status === 'complete');
  const hasError = error !== null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-sm" 
        hideCloseButton={!hasError && !isComplete}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!hasError && !isComplete && (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
            {hasError && (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            {isComplete && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {hasError ? 'Erro ao salvar' : isComplete ? 'Alterações salvas!' : 'Salvando alterações...'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5">
                {step.status === 'active' && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {step.status === 'complete' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {step.status === 'pending' && (
                  <Circle className="w-5 h-5 text-muted-foreground/40" />
                )}
                {step.status === 'error' && (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <span className={cn(
                'text-sm transition-colors',
                step.status === 'active' && 'font-medium text-foreground',
                step.status === 'pending' && 'text-muted-foreground',
                step.status === 'complete' && 'text-muted-foreground',
                step.status === 'error' && 'text-destructive font-medium'
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-2">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Tentar novamente
                </Button>
              )}
              <Button variant="default" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
