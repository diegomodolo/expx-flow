import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Historia } from "@/hooks/useHistorias";

interface HistoriaCardProps {
  historia: Historia;
  onEdit: (historia: Historia) => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high: { label: "Alta", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  medium: { label: "Média", className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

export function HistoriaCard({ historia, onEdit }: HistoriaCardProps) {
  const [expanded, setExpanded] = useState(false);

  const progressPercent = historia.subtasks_total > 0
    ? Math.round((historia.subtasks_done / historia.subtasks_total) * 100)
    : 0;

  const priority = priorityConfig[historia.priority] || priorityConfig.medium;
  const isDone = historia.status === "done";

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className={cn("transition-all", isDone && "opacity-70")}>
        <CardHeader
          className="cursor-pointer p-4 pb-2"
          onClick={() => onEdit(historia)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-medium leading-tight truncate",
                isDone && "line-through text-muted-foreground"
              )}>
                {historia.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {historia.team_name && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", historia.team_color)}>
                    {historia.team_name}
                  </Badge>
                )}
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
                  {priority.label}
                </Badge>
                {isDone && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Concluída
                  </Badge>
                )}
              </div>
            </div>

            {historia.client_logo ? (
              <img
                src={historia.client_logo}
                alt={historia.client_name || ""}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border"
              />
            ) : historia.client_name ? (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {historia.client_name.charAt(0).toUpperCase()}
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3 pt-0 space-y-2">
          {/* Client name */}
          {historia.client_name && (
            <p className="text-xs text-muted-foreground truncate">
              {historia.client_name}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{historia.subtasks_done}/{historia.subtasks_total} subtarefas</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Deadline */}
          {historia.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(historia.deadline), "dd MMM yyyy", { locale: ptBR })}</span>
            </div>
          )}

          {/* Expand subtasks */}
          {historia.subtasks_total > 0 && (
            <CollapsibleTrigger
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
              {expanded ? "Ocultar" : "Ver"} subtarefas
            </CollapsibleTrigger>
          )}

          <CollapsibleContent>
            <div className="space-y-1 pt-1 border-t mt-1">
              {historia.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 py-1 text-xs">
                  {sub.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(
                    "truncate flex-1",
                    sub.status === "done" && "line-through text-muted-foreground"
                  )}>
                    {sub.title}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {sub.responsible_name?.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
