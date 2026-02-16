import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MoreHorizontal, CheckCircle2, ChevronRight, Plus,
  Clock, ListChecks, GitBranch,
  Briefcase, Palette, BookOpen, Handshake, Users as UsersIcon, ClipboardList, Ticket, Archive,
  AlertTriangle, CheckCircle, CalendarClock, Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, differenceInDays, differenceInHours, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTaskBoardColumns, TaskBoardColumn } from "@/hooks/useTaskBoardColumns";
import { ColumnSettingsDialog } from "./ColumnSettingsDialog";
import { TemplateSelector } from "./TemplateSelector";
import { KanbanTemplate } from "@/data/kanbanTemplates";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

type TaskStatus = 'todo' | 'progress' | 'review' | 'done' | 'waiting_approval' | 'cancelled' | 'blocked' | 'paused';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  deadline?: string;
  completed_at?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard';
  related_campaign_id?: string;
  related_client_id?: string;
  quadro_column_id?: string | null;
  etapa?: string | null;
  task_type?: string | null;
  checklist?: any;
  parent_task_id?: string | null;
  team?: { name: string; color: string };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  campaign?: any;
  client?: any;
}

interface TaskKanbanProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, status: string, columnId?: string, columnName?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isCompactMode?: boolean;
  selectedBoardUserId?: string | null;
}

// Task type icons
const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Tarefa': <ClipboardList className="w-3.5 h-3.5" />,
  'Criativo': <Palette className="w-3.5 h-3.5" />,
  'Reunião': <UsersIcon className="w-3.5 h-3.5" />,
  'História': <BookOpen className="w-3.5 h-3.5" />,
  'Negócio': <Handshake className="w-3.5 h-3.5" />,
  'Ticket': <Ticket className="w-3.5 h-3.5" />,
  'Backlog': <Archive className="w-3.5 h-3.5" />,
};

const PRIORITY_CONFIG = {
  high: { label: 'Alta', color: 'hsl(var(--destructive))', bg: 'bg-destructive/10 text-destructive border-destructive/30' },
  medium: { label: 'Normal', color: 'hsl(var(--primary))', bg: 'bg-primary/10 text-primary border-primary/30' },
  low: { label: 'Baixa', color: 'hsl(142 76% 36%)', bg: 'bg-green-500/10 text-green-600 border-green-500/30' },
};

function formatDuration(minutes: number): string {
  if (minutes < 1) return '0min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function parseChecklist(raw: any): ChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDeadlineInfo(task: Task) {
  const dateStr = task.due_date || task.deadline;
  if (!dateStr) return null;

  const dueDate = new Date(dateStr);
  const now = new Date();
  const isDone = task.status === 'done';
  const completedDate = task.completed_at ? new Date(task.completed_at) : null;

  if (isDone) {
    const onTime = completedDate ? completedDate <= dueDate : true;
    return {
      label: onTime ? 'No prazo' : 'Fora do prazo',
      icon: onTime ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />,
      className: onTime ? 'text-green-600' : 'text-destructive',
    };
  }

  if (isToday(dueDate)) {
    return {
      label: 'Vence hoje',
      icon: <CalendarClock className="w-3 h-3" />,
      className: 'text-amber-600',
    };
  }

  if (isPast(dueDate)) {
    const daysLate = differenceInDays(now, dueDate);
    return {
      label: daysLate === 1 ? '1 dia atrasada' : `${daysLate} dias atrasada`,
      icon: <AlertTriangle className="w-3 h-3" />,
      className: 'text-destructive',
    };
  }

  const daysLeft = differenceInDays(dueDate, now);
  if (daysLeft <= 2) {
    return {
      label: daysLeft === 1 ? 'Amanhã' : `${daysLeft} dias restantes`,
      icon: <CalendarClock className="w-3 h-3" />,
      className: 'text-amber-600',
    };
  }

  return {
    label: format(dueDate, "dd/MM", { locale: ptBR }),
    icon: <CalendarClock className="w-3 h-3" />,
    className: 'text-muted-foreground',
  };
}

// Default columns as fallback
const DEFAULT_COLUMNS: TaskBoardColumn[] = [
  { id: 'default-todo', name: 'Pendente', status: 'todo', color: '#6B7280', order_index: 0, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-progress', name: 'Em Andamento', status: 'progress', color: '#3B82F6', order_index: 1, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-review', name: 'Em Revisão', status: 'review', color: '#8B5CF6', order_index: 2, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-done', name: 'Concluída', status: 'done', color: '#22C55E', order_index: 3, user_id: '', company_id: '', created_at: '', updated_at: '' },
];

export function TaskKanban({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask, isCompactMode = false, selectedBoardUserId }: TaskKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<TaskBoardColumn | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<TaskBoardColumn | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const { activeCompany } = useCompany();

  // Click vs drag: track if a drag actually started
  const didDragRef = useRef(false);

  const { 
    columns: userColumns, 
    isLoading: columnsLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    applyTemplate,
    isApplyingTemplate,
  } = useTaskBoardColumns(selectedBoardUserId);

  const columns = userColumns.length > 0 ? userColumns : DEFAULT_COLUMNS;
  const isUsingDefaults = userColumns.length === 0;
  const completedTasks = tasks.filter(task => task.status === 'done');

  // Bulk fetch task members for all visible tasks
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  const { data: allTaskMembers = {} } = useQuery({
    queryKey: ['kanban-task-members', taskIds.join(',')],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data } = await supabase
        .from('task_members' as any)
        .select('task_id, role, employees:employee_id(name, avatar, user_id)')
        .in('task_id', taskIds);

      // Also fetch profiles for avatars
      const employeeUserIds = [...new Set((data || []).map((m: any) => m.employees?.user_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (employeeUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', employeeUserIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.avatar_url]));
      }

      const map: Record<string, Array<{ name: string; avatar: string | null; role: string }>> = {};
      for (const m of (data || []) as any[]) {
        if (!m.employees) continue;
        if (!map[m.task_id]) map[m.task_id] = [];
        map[m.task_id].push({
          name: m.employees.name,
          avatar: profileMap.get(m.employees.user_id) || m.employees.avatar || null,
          role: m.role,
        });
      }
      return map;
    },
    enabled: taskIds.length > 0,
    staleTime: 30000,
  });

  // Bulk fetch time tracking totals
  const { data: allTimeTracking = {} } = useQuery({
    queryKey: ['kanban-time-tracking', taskIds.join(',')],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data } = await supabase
        .from('task_time_tracking')
        .select('task_id, duration_minutes, started_at, ended_at')
        .in('task_id', taskIds);

      const map: Record<string, number> = {};
      for (const s of (data || [])) {
        const mins = s.duration_minutes
          ? Number(s.duration_minutes)
          : s.ended_at
            ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
            : (Date.now() - new Date(s.started_at).getTime()) / 60000;
        map[s.task_id] = (map[s.task_id] || 0) + mins;
      }
      return map;
    },
    enabled: taskIds.length > 0,
    staleTime: 30000,
  });

  // Bulk fetch subtask counts
  const { data: allSubtaskCounts = {} } = useQuery({
    queryKey: ['kanban-subtask-counts', taskIds.join(',')],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data } = await supabase
        .from('tasks')
        .select('parent_task_id, status')
        .in('parent_task_id', taskIds);

      const map: Record<string, { total: number; done: number }> = {};
      for (const s of (data || [])) {
        const pid = s.parent_task_id!;
        if (!map[pid]) map[pid] = { total: 0, done: 0 };
        map[pid].total++;
        if (s.status === 'done') map[pid].done++;
      }
      return map;
    },
    enabled: taskIds.length > 0,
    staleTime: 30000,
  });

  // ===== Drag handlers (unchanged) =====
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };
  const handleDragEnd = () => { setDraggedTask(null); setDragOverColumn(null); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDragEnter = (columnId: string) => { setDragOverColumn(columnId); };
  const handleDragLeave = (e: React.DragEvent) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragOverColumn(null); };
  const handleDrop = (e: React.DragEvent, targetStatus: string, columnId?: string, columnName?: string) => {
    e.preventDefault();
    if (draggedTask && (draggedTask.status !== targetStatus || draggedTask.quadro_column_id !== columnId)) {
      onUpdateTaskStatus(draggedTask.id, targetStatus, columnId, columnName);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };
  const handleOpenColumnDialog = (column?: TaskBoardColumn) => { setSelectedColumn(column || null); setColumnDialogOpen(true); };
  const handleSaveColumn = (data: { name: string; status: TaskStatus; color: string }) => {
    if (selectedColumn && selectedColumn.id && !selectedColumn.id.startsWith('default-')) {
      updateColumn({ columnId: selectedColumn.id, updates: data });
    } else {
      createColumn(data);
    }
    setColumnDialogOpen(false);
    setSelectedColumn(null);
  };
  const handleDeleteColumn = () => {
    if (selectedColumn && selectedColumn.id && !selectedColumn.id.startsWith('default-')) {
      deleteColumn(selectedColumn.id);
    }
    setColumnDialogOpen(false);
    setSelectedColumn(null);
  };
  const handleColumnDragStart = (e: React.DragEvent, column: TaskBoardColumn) => {
    if (isUsingDefaults) return;
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'column');
  };
  const handleColumnDragEnd = () => { setDraggedColumn(null); setDragOverColumnId(null); };
  const handleColumnDragOver = (e: React.DragEvent) => { if (!draggedColumn) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleColumnDragEnter = (columnId: string) => { if (!draggedColumn) return; setDragOverColumnId(columnId); };
  const handleColumnDragLeave = (e: React.DragEvent) => { if (!draggedColumn) return; if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragOverColumnId(null); };
  const handleColumnDrop = (e: React.DragEvent, targetColumn: TaskBoardColumn) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn.id === targetColumn.id || isUsingDefaults) {
      setDraggedColumn(null); setDragOverColumnId(null); return;
    }
    const currentColumns = [...columns];
    const draggedIndex = currentColumns.findIndex(c => c.id === draggedColumn.id);
    const targetIndex = currentColumns.findIndex(c => c.id === targetColumn.id);
    const [removed] = currentColumns.splice(draggedIndex, 1);
    currentColumns.splice(targetIndex, 0, removed);
    reorderColumns(currentColumns.map(c => c.id));
    setDraggedColumn(null);
    setDragOverColumnId(null);
  };
  const handleApplyTemplate = (template: KanbanTemplate) => { applyTemplate(template); };

  // ===== Render enhanced task card =====
  const renderTaskCard = (task: Task, columnColor: string, inModal = false) => {
    const members = allTaskMembers[task.id] || [];
    const timeMinutes = allTimeTracking[task.id] || 0;
    const subtasks = allSubtaskCounts[task.id] || null;
    const checklist = parseChecklist(task.checklist);
    const checkDone = checklist.filter(c => c.completed).length;
    const deadlineInfo = getDeadlineInfo(task);
    const taskType = task.task_type || 'Tarefa';
    const typeIcon = TASK_TYPE_ICONS[taskType] || <ClipboardList className="w-3.5 h-3.5" />;
    const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

    // Gather all people to show (responsible + members)
    const people: Array<{ name: string; avatar: string | null }> = [];
    // Add responsible first
    people.push({
      name: task.responsible_name || 'Sem responsável',
      avatar: task.responsible_avatar || task.user_profile?.avatar_url || null,
    });
    // Add unique members
    for (const m of members) {
      if (!people.find(p => p.name === m.name)) {
        people.push({ name: m.name, avatar: m.avatar });
      }
    }

    return (
      <Card
        key={task.id}
        className={cn(
          "shadow-sm hover:shadow-md transition-all border-l-4 bg-card group select-none",
          "cursor-pointer",
          !inModal && draggedTask?.id === task.id && 'opacity-50 rotate-2 scale-105',
          isCompactMode ? "p-2" : "p-3"
        )}
        style={{ borderLeftColor: priorityConf.color }}
        draggable={!inModal}
        onDragStart={!inModal ? (e) => { didDragRef.current = true; handleDragStart(e, task); } : undefined}
        onDragEnd={!inModal ? () => { handleDragEnd(); didDragRef.current = false; } : undefined}
        onClick={(e) => {
          if (didDragRef.current) { didDragRef.current = false; return; }
          const target = e.target as HTMLElement;
          if (target.closest('button, [role="menuitem"]')) return;
          onEditTask(task);
        }}
      >
        <CardContent className="p-0 space-y-2.5">
          {/* Row 1: Type icon + Client + Priority + Menu */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground shrink-0">{typeIcon}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{taskType}</TooltipContent>
              </Tooltip>
              {task.client?.name && (
                <span className="text-[11px] text-muted-foreground truncate">
                  {task.client.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", priorityConf.bg)}>
                {priorityConf.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>Editar</DropdownMenuItem>
                  {task.status !== 'done' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateTaskStatus(task.id, 'done'); }}>Concluir</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="text-destructive">Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: Avatars */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {people.slice(0, 4).map((p, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Avatar className={cn("border-2 border-card", isCompactMode ? "h-6 w-6" : "h-7 w-7")}>
                      {p.avatar && <AvatarImage src={p.avatar} className="object-cover" />}
                      <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                        {p.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{p.name}</TooltipContent>
                </Tooltip>
              ))}
              {people.length > 4 && (
                <div className={cn("rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium", isCompactMode ? "h-6 w-6" : "h-7 w-7")}>
                  +{people.length - 4}
                </div>
              )}
            </div>
            {!isCompactMode && people.length > 0 && (
              <span className="text-xs text-muted-foreground truncate">{people[0].name}</span>
            )}
          </div>

          {/* Row 3: Title */}
          <h4 className={cn(
            "font-semibold text-foreground leading-snug line-clamp-2",
            isCompactMode ? "text-xs" : "text-sm"
          )}>
            {task.title}
          </h4>

          {/* Row 4: Time tracked */}
          {timeMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="w-3 h-3" />
              <span>{formatDuration(timeMinutes)} trabalhado</span>
            </div>
          )}

          {/* Row 5: Deadline + Subtasks/Checklist */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {deadlineInfo && (
              <div className={cn("flex items-center gap-1 text-[11px] font-medium", deadlineInfo.className)}>
                {deadlineInfo.icon}
                <span>{deadlineInfo.label}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {subtasks && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <GitBranch className="w-3 h-3" />
                      <span>{subtasks.done}/{subtasks.total}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Subtarefas: {subtasks.done} de {subtasks.total} concluídas</TooltipContent>
                </Tooltip>
              )}
              {checklist.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ListChecks className="w-3 h-3" />
                      <span>{checkDone}/{checklist.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Checklist: {checkDone} de {checklist.length} completos</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Row 6: Progress bar */}
          {task.progress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={task.progress} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">{task.progress}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className={cn(
        "flex overflow-x-auto overflow-y-hidden",
        isCompactMode ? "gap-3 pb-2 h-[calc(100vh-200px)]" : "gap-6 pb-4 h-[calc(100vh-420px)]"
      )}>
        {(() => {
          const assignedTaskIds = new Set<string>();
          
          return columns.map((column, columnIndex) => {
            const columnTasks = tasks.filter(task => {
              if (task.status !== column.status) return false;
              if (assignedTaskIds.has(task.id)) return false;
              return true;
            });
            
            const isFirstColumnOfStatus = columns.findIndex(c => c.status === column.status) === columnIndex;
            if (isFirstColumnOfStatus) {
              columnTasks.forEach(task => assignedTaskIds.add(task.id));
            } else {
              columnTasks.length = 0;
            }
            const isDropTarget = dragOverColumn === column.id;
            const canDrop = draggedTask && draggedTask.status !== column.status;
            const isDoneColumn = column.status === 'done';
            const isColumnDragTarget = dragOverColumnId === column.id && draggedColumn?.id !== column.id;
            const isBeingDragged = draggedColumn?.id === column.id;
            const isEmpty = columnTasks.length === 0;
            const isExpandedEmpty = isEmpty && isDropTarget && canDrop;
            
            return (
              <div 
                key={column.id} 
                className={cn(
                  "flex flex-col transition-all duration-200 flex-none",
                  isEmpty && !isExpandedEmpty
                    ? "w-16"
                    : isCompactMode ? "w-[240px]" : "w-[300px]",
                  isBeingDragged && 'opacity-50 scale-95',
                  isColumnDragTarget && 'ring-2 ring-primary ring-offset-2 rounded-lg'
                )}
                onDragOver={handleColumnDragOver}
                onDragEnter={() => handleColumnDragEnter(column.id)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => {
                  if (draggedColumn) handleColumnDrop(e, column);
                }}
              >
                <div 
                  className={cn(
                    "rounded-t-lg border-b border-border",
                    isEmpty && !isExpandedEmpty ? "flex flex-col items-center py-3 px-1" : "flex items-center justify-between",
                    !isUsingDefaults && 'cursor-grab active:cursor-grabbing',
                    isCompactMode ? "p-2" : isEmpty && !isExpandedEmpty ? "" : "p-4"
                  )}
                  style={{ backgroundColor: `${column.color}20` }}
                  draggable={!isUsingDefaults}
                  onDragStart={(e) => handleColumnDragStart(e, column)}
                  onDragEnd={handleColumnDragEnd}
                >
                  {isEmpty && !isExpandedEmpty ? (
                    <span
                      className="font-semibold text-xs whitespace-nowrap"
                      style={{ color: column.color, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                    >
                      {column.name}
                    </span>
                  ) : (
                    <>
                      <h3 className={cn(
                        "font-semibold flex items-center gap-2",
                        isCompactMode && "text-sm"
                      )} style={{ color: column.color }}>
                        {!isUsingDefaults && <span className="opacity-40 mr-1">⋮⋮</span>}
                        {column.name}
                        <Badge variant="secondary" className={cn("bg-background/80", isCompactMode && "text-xs px-1.5 py-0")}>{columnTasks.length}</Badge>
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("opacity-60 hover:opacity-100", isCompactMode ? "h-5 w-5" : "h-6 w-6")}
                        onClick={() => handleOpenColumnDialog(column)}
                        title="Configurações da coluna"
                      >
                        <MoreHorizontal className={cn(isCompactMode ? "h-3 w-3" : "h-3.5 w-3.5")} />
                      </Button>
                    </>
                  )}
                </div>
                
                <div 
                  className={cn(
                    "flex-1 bg-muted/30 rounded-b-lg border border-t-0 border-border transition-colors overflow-y-auto",
                    isEmpty && !isExpandedEmpty ? "p-0" : isCompactMode ? "p-2 space-y-2" : "p-3 space-y-2.5",
                    isDropTarget && canDrop && 'bg-primary/10 border-2 border-primary border-dashed'
                  )}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.status, column.id.startsWith('default-') ? undefined : column.id, column.name)}
                >
                  {isDoneColumn ? (
                    <>
                      {columnTasks.length > 0 ? (
                        <Card 
                          className="p-6 border cursor-pointer hover:shadow-md transition-all group"
                          style={{ 
                            background: `linear-gradient(135deg, ${column.color}10, ${column.color}20)`,
                            borderColor: `${column.color}40`
                          }}
                          onClick={() => setCompletedTasksModalOpen(true)}
                        >
                          <CardContent className="p-0 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${column.color}30` }}>
                                <CheckCircle2 className="w-8 h-8" style={{ color: column.color }} />
                              </div>
                              <div>
                                <p className="text-3xl font-bold" style={{ color: column.color }}>{columnTasks.length}</p>
                                <p className="text-sm" style={{ color: column.color }}>{columnTasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs group-hover:translate-x-1 transition-transform" style={{ color: column.color }}>
                                <span>Ver tarefas</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className={`text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed transition-colors ${
                          isDropTarget && canDrop ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                        }`}>
                          {isDropTarget && canDrop ? (
                            <><div className="text-4xl mb-2">📥</div><p className="text-sm font-medium">Solte aqui para mover</p></>
                          ) : (
                            <><CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" /><p className="text-sm">Nenhuma tarefa concluída</p></>
                          )}
                        </div>
                      )}
                      {columnTasks.length > 0 && isDropTarget && canDrop && (
                        <div className="border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 text-center">
                          <p className="text-sm font-medium text-primary">Solte aqui para mover</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {columnTasks.map((task) => renderTaskCard(task, column.color))}
                      {columnTasks.length === 0 && (
                        <div className={`text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed transition-colors ${
                          isDropTarget && canDrop ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                        }`}>
                          {isDropTarget && canDrop ? (
                            <><div className="text-4xl mb-2">📥</div><p className="text-sm font-medium">Solte aqui para mover</p></>
                          ) : (
                            <><div className="text-4xl mb-2">📝</div><p className="text-sm">Nenhuma tarefa</p></>
                          )}
                        </div>
                      )}
                      {columnTasks.length > 0 && isDropTarget && canDrop && (
                        <div className="border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 text-center">
                          <p className="text-sm font-medium text-primary">Solte aqui para mover</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          });
        })()}
          
        <div className="flex flex-col min-w-[200px]">
          <Button
            variant="outline"
            className="h-14 border-dashed flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenColumnDialog()}
          >
            <Plus className="h-4 w-4" />
            Nova Coluna
          </Button>
        </div>
      </div>

      {/* Modal de tarefas concluídas */}
      <Dialog open={completedTasksModalOpen} onOpenChange={setCompletedTasksModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
              Tarefas Concluídas ({completedTasks.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                  <p>Nenhuma tarefa concluída ainda</p>
                </div>
              ) : (
                completedTasks.map((task) => renderTaskCard(task, '#22C55E', true))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ColumnSettingsDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        column={selectedColumn}
        onSave={handleSaveColumn}
        onDelete={handleDeleteColumn}
        isEditing={!!selectedColumn && !selectedColumn.id.startsWith('default-')}
      />

      <TemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onApplyTemplate={handleApplyTemplate}
        isApplying={isApplyingTemplate}
        hasExistingColumns={!isUsingDefaults}
      />
    </>
  );
}
