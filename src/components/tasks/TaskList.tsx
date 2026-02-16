import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit, CheckCircle, MoreHorizontal, Trash2, CalendarClock, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TaskStatus = 'todo' | 'progress' | 'review' | 'done' | 'waiting_approval' | 'cancelled' | 'blocked' | 'paused';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard' | 'flow' | 'ghost';
  related_campaign_id?: string;
  related_client_id?: string;
  team?: { name: string; color: string };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  campaign?: any;
  client?: any;
}

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const STATUS_ORDER: TaskStatus[] = [
  'todo', 'progress', 'review', 'waiting_approval', 'blocked', 'paused', 'done', 'cancelled',
];

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dotColor: string }> = {
  todo: { label: 'Pendente', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' },
  progress: { label: 'Em Andamento', color: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500' },
  review: { label: 'Em Revisão', color: 'text-purple-600 dark:text-purple-400', dotColor: 'bg-purple-500' },
  waiting_approval: { label: 'Aguardando Aprovação', color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500' },
  blocked: { label: 'Bloqueada', color: 'text-destructive', dotColor: 'bg-destructive' },
  paused: { label: 'Pausada', color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-500' },
  done: { label: 'Concluída', color: 'text-green-600 dark:text-green-400', dotColor: 'bg-green-500' },
  cancelled: { label: 'Cancelada', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground/50' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  medium: { label: 'Média', className: 'bg-primary/10 text-primary border-primary/30' },
  low: { label: 'Baixa', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
};

export function TaskList({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask }: TaskListProps) {
  const isOverdue = (dueDate: string | undefined, status: TaskStatus) => {
    if (!dueDate || status === 'done' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const groupedTasks = useMemo(() => {
    const groups: { status: TaskStatus; tasks: Task[] }[] = [];
    for (const status of STATUS_ORDER) {
      const filtered = tasks.filter(t => t.status === status);
      if (filtered.length > 0) {
        groups.push({ status, tasks: filtered });
      }
    }
    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-sm text-muted-foreground">Crie uma nova tarefa para começar a organizar seu trabalho.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {groupedTasks.map(({ status, tasks: groupTasks }) => {
        const config = STATUS_CONFIG[status];
        return (
          <div key={status}>
            {/* Status group header */}
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.dotColor)} />
              <h3 className={cn("text-sm font-semibold", config.color)}>
                {config.label}
              </h3>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {groupTasks.length}
              </Badge>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Tarefa</TableHead>
                    <TableHead className="w-[15%]">Responsável</TableHead>
                    <TableHead className="w-[12%]">Prioridade</TableHead>
                    <TableHead className="w-[12%]">Prazo</TableHead>
                    <TableHead className="w-[12%]">Cliente</TableHead>
                    <TableHead className="w-[9%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupTasks.map((task) => {
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const overdue = isOverdue(task.due_date, task.status);

                    return (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onEditTask(task)}
                      >
                        {/* Title */}
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("font-medium text-foreground truncate", task.status === 'done' && "line-through text-muted-foreground")}>
                              {task.title}
                            </span>
                            {task.team?.name && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 shrink-0"
                                style={{
                                  backgroundColor: `${task.team.color}15`,
                                  borderColor: task.team.color,
                                  color: task.team.color,
                                }}
                              >
                                {task.team.name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Responsible */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {(task.responsible_avatar || task.user_profile?.avatar_url) && (
                                <AvatarImage
                                  src={task.responsible_avatar || task.user_profile?.avatar_url || ''}
                                  alt={task.responsible_name}
                                />
                              )}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {task.responsible_name
                                  ? task.responsible_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                                  : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate">
                              {task.responsible_name || 'Sem responsável'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", priority.className)}>
                            {priority.label}
                          </Badge>
                        </TableCell>

                        {/* Due date */}
                        <TableCell>
                          {task.due_date ? (
                            <div className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {overdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                              {format(new Date(task.due_date), "dd/MM/yy", { locale: ptBR })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Client */}
                        <TableCell>
                          {task.client?.name ? (
                            <span className="text-sm text-muted-foreground truncate">{task.client.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {task.status !== 'done' && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateTaskStatus(task.id, 'done'); }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Concluir
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
