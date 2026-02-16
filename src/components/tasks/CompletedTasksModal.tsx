import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, Search, Clock, CalendarCheck, AlertTriangle,
  ListChecks, Users as UsersIcon, Briefcase
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  deadline?: string;
  completed_at?: string;
  progress: number;
  task_type?: string | null;
  user_profile?: { avatar_url: string | null; full_name: string | null } | null;
  client?: any;
  team?: { name: string; color: string };
}

interface CompletedTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onEditTask: (task: any) => void;
  allTimeTracking: Record<string, number>;
}

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  medium: { label: 'Normal', className: 'bg-primary/10 text-primary border-primary/30' },
  low: { label: 'Baixa', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
};

function formatDuration(minutes: number): string {
  if (minutes < 1) return '0min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

export function CompletedTasksModal({ open, onOpenChange, tasks, onEditTask, allTimeTracking }: CompletedTasksModalProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');

  const responsibles = useMemo(() => {
    const names = new Set(tasks.map(t => t.responsible_name).filter(Boolean));
    return Array.from(names).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase()) &&
          !t.client?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (responsibleFilter !== 'all' && t.responsible_name !== responsibleFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, responsibleFilter]);

  // Stats
  const totalTime = useMemo(() => tasks.reduce((acc, t) => acc + (allTimeTracking[t.id] || 0), 0), [tasks, allTimeTracking]);
  const onTimeCount = tasks.filter(t => {
    if (!t.completed_at || (!t.due_date && !t.deadline)) return true;
    const completed = new Date(t.completed_at);
    const due = new Date((t.due_date || t.deadline)!);
    return completed <= due;
  }).length;
  const lateCount = tasks.length - onTimeCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Concluídas
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Total concluídas</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{onTimeCount}</p>
              <p className="text-xs text-muted-foreground">No prazo</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{lateCount}</p>
              <p className="text-xs text-muted-foreground">Fora do prazo</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{formatDuration(totalTime)}</p>
              <p className="text-xs text-muted-foreground">Tempo total</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefa, cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsibles.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_140px_100px_120px_100px] gap-2 px-6 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
            <span>Tarefa</span>
            <span>Responsável</span>
            <span>Concluída em</span>
            <span>Prazo</span>
            <span>Tempo gasto</span>
            <span>Prioridade</span>
          </div>

          <ScrollArea className="h-[calc(90vh-300px)]">
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                  <p className="text-sm">Nenhuma tarefa encontrada</p>
                </div>
              ) : (
                filtered.map(task => {
                  const completedDate = task.completed_at ? new Date(task.completed_at) : null;
                  const dueDate = task.due_date || task.deadline ? new Date((task.due_date || task.deadline)!) : null;
                  const wasOnTime = completedDate && dueDate ? completedDate <= dueDate : true;
                  const timeMinutes = allTimeTracking[task.id] || 0;
                  const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
                  const avatar = task.responsible_avatar || task.user_profile?.avatar_url || null;

                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-[1fr_140px_140px_100px_120px_100px] gap-2 px-6 py-3 items-center hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => onEditTask(task)}
                    >
                      {/* Task title + client */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        {task.client?.name && (
                          <p className="text-xs text-muted-foreground truncate">{task.client.name}</p>
                        )}
                      </div>

                      {/* Responsible */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(task.responsible_name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground truncate">{task.responsible_name || '—'}</span>
                      </div>

                      {/* Completed date */}
                      <span className="text-xs text-muted-foreground">
                        {completedDate ? format(completedDate, "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : '—'}
                      </span>

                      {/* On time? */}
                      <div>
                        {dueDate ? (
                          <span className={cn("flex items-center gap-1 text-xs font-medium", wasOnTime ? "text-green-500" : "text-destructive")}>
                            {wasOnTime ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {wasOnTime ? 'No prazo' : 'Atrasada'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Time spent */}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {timeMinutes > 0 ? formatDuration(timeMinutes) : '—'}
                      </span>

                      {/* Priority */}
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border w-fit", priority.className)}>
                        {priority.label}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
