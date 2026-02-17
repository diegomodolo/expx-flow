import React from "react";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Clock, AlertTriangle, GripVertical, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className="flex flex-col h-full" data-backlog-column="true">
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
                            snapshot.isDragging
                              ? "rounded-lg bg-primary/10 border border-primary/30 text-primary px-2 py-1 cursor-grabbing shadow-lg z-50 flex items-center gap-1"
                          : cn(
                                  "rounded-lg bg-card border border-border px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-all duration-200 border-l-2",
                                  borderColor,
                                  isAging && "ring-1 ring-yellow-500/50 animate-pulse",
                                )
                          )}
                          style={{
                            ...provided.draggableProps.style,
                            ...(snapshot.isDragging ? { width: '180px', height: '32px' } : {}),
                          }}
                        >
                          {snapshot.isDragging ? (
                            <>
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="text-xs font-medium truncate">{task.title}</span>
                              <span className="text-[10px] ml-auto opacity-60">{task.ai_estimated_minutes || 20}m</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <p className="text-xs text-foreground font-medium truncate flex-1">{task.title}</p>
                                {task.clients && task.clients.length > 0 && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {task.clients.slice(0, 2).map((client) => (
                                      <Avatar key={client.client_id} className="w-4 h-4 flex-shrink-0">
                                        <AvatarImage src={client.client_avatar || undefined} alt={client.client_name} />
                                        <AvatarFallback className="text-[7px] bg-muted">
                                          {client.client_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.clients.length > 2 && (
                                      <span className="text-[9px] text-muted-foreground">+{task.clients.length - 2}</span>
                                    )}
                                  </div>
                                )}
                                <span className="text-[9px] text-muted-foreground flex-shrink-0">{task.ai_estimated_minutes || 20}m</span>
                              </div>
                              {isAging && (
                                <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                          )}
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
                            <span>Tempo: {task.ai_estimated_minutes || 20}min</span>
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
