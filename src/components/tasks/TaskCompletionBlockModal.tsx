import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ListChecks, GitBranch } from 'lucide-react';

interface PendingItem {
  type: 'subtasks' | 'checklist';
  count: number;
}

interface TaskCompletionBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingItems: PendingItem[];
}

export function TaskCompletionBlockModal({ open, onOpenChange, pendingItems }: TaskCompletionBlockModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">Tarefa não pode ser finalizada</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3 space-y-3">
            <p>Esta tarefa possui pendências que precisam ser resolvidas antes de ser concluída:</p>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div key={item.type} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  {item.type === 'subtasks' ? (
                    <GitBranch className="w-4 h-4 text-orange-500 shrink-0" />
                  ) : (
                    <ListChecks className="w-4 h-4 text-orange-500 shrink-0" />
                  )}
                  <span className="text-sm text-foreground">
                    {item.type === 'subtasks'
                      ? `${item.count} sub-tarefa${item.count > 1 ? 's' : ''} pendente${item.count > 1 ? 's' : ''}`
                      : `${item.count} item${item.count > 1 ? 'ns' : ''} de checklist pendente${item.count > 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
