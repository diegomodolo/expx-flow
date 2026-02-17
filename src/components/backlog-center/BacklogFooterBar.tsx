import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckSquare, Send, Users, X } from "lucide-react";

interface Props {
  selectionStats: { count: number; totalMinutes: number; capacityPercent: number };
  onRelease: () => void;
  onClear: () => void;
  onSelectAll: () => void;
  releasing: boolean;
}

export function BacklogFooterBar({ selectionStats, onRelease, onClear, onSelectAll, releasing }: Props) {
  const { count, totalMinutes, capacityPercent } = selectionStats;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;

  return (
    <div
      className={cn(
        "border-t bg-card px-6 py-3 flex items-center justify-between gap-4 transition-all duration-300",
        count > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none h-0 p-0 border-0"
      )}
    >
      {/* Left: stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{count} tarefas selecionadas</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{timeLabel}</span>
        </span>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                capacityPercent <= 80 ? "bg-primary" : capacityPercent <= 100 ? "bg-warning" : "bg-destructive"
              )}
              style={{ width: `${Math.min(100, capacityPercent)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{capacityPercent}% de 1 colaborador</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          <Users className="w-4 h-4 mr-1" />
          Selecionar tudo
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
        <Button size="sm" onClick={onRelease} disabled={releasing}>
          <Send className="w-4 h-4 mr-1" />
          Liberar para Líderes
        </Button>
      </div>
    </div>
  );
}
