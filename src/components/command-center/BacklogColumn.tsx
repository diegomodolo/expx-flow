import React from "react";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Clock, AlertTriangle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tasks: CommandCenterTask[];
  getAgingHours: (createdAt: string) => number;
  teamColor?: string;
}

const priorityColors: Record<string, string> = {
  urgent: "border-destructive",
  high: "border-orange-500",
  medium: "border-yellow-500",
  low: "border-emerald-500",
};

const typeColors: Record<string, string> = {
  copy: "border-l-primary",
  design: "border-l-purple-400",
  social_media: "border-l-emerald-400",
  default: "border-l-border",
};

export function BacklogColumn({ tasks, getAgingHours, teamColor }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Backlog
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>

      <Droppable droppableId="backlog">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto space-y-2 px-3 pb-3 min-h-[200px]"
          >
            {tasks.map((task, index) => {
              const aging = getAgingHours(task.created_at);
              const isAging = aging > 4;
              const borderColor = typeColors[task.task_type] || typeColors.default;

              return (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "rounded-xl bg-card border border-border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 border-l-2",
                            borderColor,
                            isAging && "ring-1 ring-yellow-500/50 animate-pulse",
                            snapshot.isDragging && "shadow-lg scale-105 z-50"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full",
                                  priorityColors[task.priority] ? `border ${priorityColors[task.priority]} text-muted-foreground` : "text-muted-foreground"
                                )}>
                                  {task.priority}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.ai_estimated_minutes || 18}m
                                </span>
                              </div>
                            </div>
                            {isAging && (
                              <div className="flex items-center gap-1 text-yellow-500">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="text-[10px]">{aging}h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-72">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Prioridade: {task.priority}</span>
                            <span>Tempo: {task.ai_estimated_minutes || 18}min</span>
                          </div>
                          <p className="text-xs text-muted-foreground/70">Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                <Clock className="w-8 h-8 mb-2" />
                <p className="text-xs">Backlog vazio</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
