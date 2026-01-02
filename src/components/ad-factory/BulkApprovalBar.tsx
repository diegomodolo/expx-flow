import { Button } from "@/components/ui/button";
import { Check, X, CheckSquare, Square } from "lucide-react";

interface BulkApprovalBarProps {
  selectedCount: number;
  totalCount: number;
  onApprove: () => void;
  onReject: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export function BulkApprovalBar({
  selectedCount,
  totalCount,
  onApprove,
  onReject,
  onSelectAll,
  onClear,
}: BulkApprovalBarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div className="sticky top-0 z-10 bg-card border border-border rounded-lg p-4 shadow-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className="gap-2"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {allSelected ? "Desmarcar todos" : "Selecionar todos"}
        </Button>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedCount}</span>{" "}
          de {totalCount} selecionados
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
        >
          Limpar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <X className="w-4 h-4 mr-1" />
          Rejeitar ({selectedCount})
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          className="bg-green-500 hover:bg-green-600"
        >
          <Check className="w-4 h-4 mr-1" />
          Aprovar ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
