import React from 'react';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import type { RoteiroAtividade, AtividadeInput } from '@/hooks/useRoteiroAtividades';

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AtividadeInput) => void;
  atividade?: RoteiroAtividade | null;
  loading?: boolean;
  onDelete?: () => void;
}

export function AtividadeDialog({ open, onOpenChange, onSave, atividade, loading, onDelete }: AtividadeDialogProps) {
  return (
    <TaskDialog
      open={open}
      onOpenChange={onOpenChange}
      task={atividade}
      onSave={onSave}
      mode="roteiro"
      loading={loading}
      onDelete={onDelete}
    />
  );
}
