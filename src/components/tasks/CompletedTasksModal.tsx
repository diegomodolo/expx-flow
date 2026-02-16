import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle2, Search, Clock, AlertTriangle, CalendarIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
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
  const [sortField, setSortField] = useState<string>('completed_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Date range filter - default to current month
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(now));

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'completed_at' ? 'desc' : 'asc');
    }
  };

  const responsibles = useMemo(() => {
    const names = new Set(tasks.map(t => t.responsible_name).filter(Boolean));
    return Array.from(names).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    const list = tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase()) &&
          !t.client?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (responsibleFilter !== 'all' && t.responsible_name !== responsibleFilter) return false;

      // Date range filter
      if (t.completed_at && (dateFrom || dateTo)) {
        const completed = new Date(t.completed_at);
        if (dateFrom && completed < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (completed > endOfDay) return false;
        }
      }

      return true;
    });

    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'client':
          cmp = (a.client?.name || '').localeCompare(b.client?.name || '');
          break;
        case 'completed_at':
          cmp = new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime();
          break;
        case 'deadline': {
          const da = a.due_date || a.deadline || '';
          const db = b.due_date || b.deadline || '';
          cmp = new Date(da || 0).getTime() - new Date(db || 0).getTime();
          break;
        }
        case 'time':
          cmp = (allTimeTracking[a.id] || 0) - (allTimeTracking[b.id] || 0);
          break;
        case 'priority':
          cmp = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
      }
      return cmp * dir;
    });

    return list;
  }, [tasks, search, priorityFilter, responsibleFilter, sortField, sortDir, allTimeTracking, dateFrom, dateTo]);

  // Stats based on filtered
  const totalTime = useMemo(() => filtered.reduce((acc, t) => acc + (allTimeTracking[t.id] || 0), 0), [filtered, allTimeTracking]);
  const onTimeCount = filtered.filter(t => {
    if (!t.completed_at || (!t.due_date && !t.deadline)) return true;
    const completed = new Date(t.completed_at);
    const due = new Date((t.due_date || t.deadline)!);
    return completed <= due;
  }).length;
  const lateCount = filtered.length - onTimeCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] flex flex-col p-0 bg-muted/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Concluídas
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body with cards */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total concluídas</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-500">{onTimeCount}</p>
              <p className="text-xs text-muted-foreground mt-1">No prazo</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-destructive">{lateCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Fora do prazo</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-primary">{formatDuration(totalTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Tempo total</p>
            </div>
          </div>

          {/* Filters card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Filtros</p>
            <div className="flex flex-wrap gap-3">
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

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2 text-xs font-normal">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ptBR}
                    initialFocus
                  />
                  {dateFrom && (
                    <div className="p-2 border-t border-border">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateFrom(undefined)}>Limpar</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2 text-xs font-normal">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ptBR}
                    initialFocus
                  />
                  {dateTo && (
                    <div className="p-2 border-t border-border">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateTo(undefined)}>Limpar</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table card */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Table header */}
          {(() => {
            const SortIcon = ({ field }: { field: string }) => {
              if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
              return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
            };
            const cols = [
              { field: 'title', label: 'Tarefa' },
              { field: 'client', label: 'Cliente' },
              { field: 'completed_at', label: 'Concluída em' },
              { field: 'deadline', label: 'Prazo' },
              { field: 'time', label: 'Tempo gasto' },
              { field: 'priority', label: 'Prioridade' },
            ];
            return (
              <div className="grid grid-cols-[1fr_160px_140px_100px_120px_100px] gap-2 px-6 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
                {cols.map(c => (
                  <button
                    key={c.field}
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
                    onClick={() => toggleSort(c.field)}
                  >
                    {c.label}
                    <SortIcon field={c.field} />
                  </button>
                ))}
              </div>
            );
          })()}

          <ScrollArea className="max-h-[calc(90vh-420px)]">
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
                      className="grid grid-cols-[1fr_160px_140px_100px_120px_100px] gap-2 px-6 py-3 items-center hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => onEditTask(task)}
                    >
                      {/* Responsible avatar + Task title */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={avatar || undefined} />
                              <AvatarFallback className="text-[10px] bg-muted">
                                {(task.responsible_name || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{task.responsible_name || 'Sem responsável'}</TooltipContent>
                        </Tooltip>
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      </div>

                      {/* Client with logo */}
                      <div className="flex items-center gap-2 min-w-0">
                        {task.client?.logo_url ? (
                          <img
                            src={task.client.logo_url}
                            alt={task.client.name}
                            className="h-6 w-6 rounded object-cover shrink-0"
                          />
                        ) : task.client?.name ? (
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {task.client.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        ) : null}
                        <span className="text-xs text-foreground truncate">{task.client?.name || '—'}</span>
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
          </div> {/* end table card */}
        </div> {/* end scrollable body */}
      </DialogContent>
    </Dialog>
  );
}
