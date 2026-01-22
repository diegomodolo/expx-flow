import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskBoardColumn } from "@/hooks/useTaskBoardColumns";
import { Trash2 } from "lucide-react";

const COLOR_PALETTE = [
  { value: '#6B7280', label: 'Cinza', bgClass: 'bg-gray-500' },
  { value: '#3B82F6', label: 'Azul', bgClass: 'bg-blue-500' },
  { value: '#8B5CF6', label: 'Roxo', bgClass: 'bg-purple-500' },
  { value: '#22C55E', label: 'Verde', bgClass: 'bg-green-500' },
  { value: '#F59E0B', label: 'Amarelo', bgClass: 'bg-yellow-500' },
  { value: '#EF4444', label: 'Vermelho', bgClass: 'bg-red-500' },
  { value: '#EC4899', label: 'Rosa', bgClass: 'bg-pink-500' },
  { value: '#14B8A6', label: 'Teal', bgClass: 'bg-teal-500' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Pendente (todo)' },
  { value: 'progress', label: 'Em Andamento (progress)' },
  { value: 'review', label: 'Em Revisão (review)' },
  { value: 'done', label: 'Concluída (done)' },
];

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: TaskBoardColumn | null;
  onSave: (data: { name: string; status: 'todo' | 'progress' | 'review' | 'done'; color: string }) => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export function ColumnSettingsDialog({
  open,
  onOpenChange,
  column,
  onSave,
  onDelete,
  isEditing = false,
}: ColumnSettingsDialogProps) {
  const [name, setName] = useState(column?.name || '');
  const [status, setStatus] = useState<'todo' | 'progress' | 'review' | 'done'>(column?.status || 'todo');
  const [color, setColor] = useState(column?.color || '#6B7280');

  React.useEffect(() => {
    if (column) {
      setName(column.name);
      setStatus(column.status);
      setColor(column.color);
    } else {
      setName('');
      setStatus('todo');
      setColor('#6B7280');
    }
  }, [column, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSave({ name: name.trim(), status, color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Coluna' : 'Nova Coluna'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Coluna</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Em Análise"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status Mapeado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define qual status da tarefa será usado quando movida para esta coluna.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {isEditing && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir esta coluna? As tarefas não serão excluídas.')) {
                    onDelete();
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            ) : (
              <div />
            )}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Salvar' : 'Criar Coluna'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
