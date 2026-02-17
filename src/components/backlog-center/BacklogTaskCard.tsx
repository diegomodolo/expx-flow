import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, RotateCcw, AlertTriangle } from "lucide-react";
import type { BacklogTask } from "@/hooks/useBacklogCommandCenter";

interface Props {
  task: BacklogTask;
  selected: boolean;
  onToggle: () => void;
  readiness: { ready: boolean; hasDescription: boolean; hasEstimate: boolean; hasClient: boolean };
  agingHours: number;
}

export function BacklogTaskCard({ task, selected, onToggle, readiness, agingHours }: Props) {
  const minutes = task.ai_estimated_minutes || 18;
  // Proportional height: 60-120px based on estimated minutes
  const cardMinHeight = Math.min(120, Math.max(60, (minutes / 60) * 120));
  const isUrgent = task.priority === "high" || agingHours > 48;
  const isRecurring = !!task.recurring_template_id;

  return (
    <div
      onClick={onToggle}
      style={{ minHeight: `${cardMinHeight}px` }}
      className={cn(
        "relative rounded-lg border p-3 cursor-pointer transition-all group",
        "hover:elevation-2",
        selected && "ring-2 ring-primary border-primary/40 bg-primary/5",
        !readiness.ready && "opacity-60",
        isUrgent && "border-destructive/50 animate-pulse-slow"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2">
            {readiness.ready && (
              <Zap className="w-3.5 h-3.5 text-warning shrink-0" />
            )}
            <p className="text-sm font-medium truncate">{task.title}</p>
          </div>

          {/* Description preview */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}

          {/* Tags & metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority */}
            <Badge
              variant={task.priority === "high" ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0 h-4"
            >
              {task.priority === "high" ? "URGENTE" : task.priority === "medium" ? "Média" : "Baixa"}
            </Badge>

            {/* Time */}
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {minutes}min
            </span>

            {/* Type */}
            {task.task_type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {task.task_type}
              </Badge>
            )}

            {/* Recurring */}
            {isRecurring && (
              <span title="Recorrente"><RotateCcw className="w-3 h-3 text-muted-foreground" /></span>
            )}

            {/* Aging warning */}
            {agingHours > 24 && (
              <span className="text-[10px] text-destructive flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />
                {Math.floor(agingHours / 24)}d no backlog
              </span>
            )}
          </div>

          {/* Readiness indicators */}
          {!readiness.ready && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {!readiness.hasDescription && <span className="text-destructive">⬚ Sem briefing</span>}
              {!readiness.hasEstimate && <span className="text-destructive">⬚ Sem estimativa</span>}
              {!readiness.hasClient && <span className="text-destructive">⬚ Sem cliente</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
