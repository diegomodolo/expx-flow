import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface SyncProgressModalProps {
  open: boolean;
  progress: {
    current: number;
    total: number;
    clientName: string;
  };
}

export const SyncProgressModal = ({ open, progress }: SyncProgressModalProps) => {
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sincronizando clientes
          </DialogTitle>
          <DialogDescription>
            Aguarde enquanto sincronizamos os dados dos clientes...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {progress.current} de {progress.total}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          {progress.clientName && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Sincronizando:</p>
              <p className="font-medium">{progress.clientName}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};