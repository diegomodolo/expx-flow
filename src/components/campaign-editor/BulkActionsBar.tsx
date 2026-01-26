import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  isLoading: boolean;
  onPause: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  isLoading,
  onPause,
  onActivate,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-card border rounded-lg px-4 py-3 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "item selecionado" : "itens selecionados"}
        </span>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            disabled={isLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pausar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onActivate}
            disabled={isLoading}
            className="text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          >
            <Play className="w-4 h-4 mr-2" />
            Ativar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={isLoading}
      >
        <X className="w-4 h-4 mr-2" />
        Limpar
      </Button>
    </div>
  );
}
