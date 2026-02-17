import { ScrollArea } from "@/components/ui/scroll-area";
import { BacklogQuickEntry } from "./BacklogQuickEntry";
import { Loader2, Inbox, Pencil, Clock, Zap, RotateCcw, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { useState, useMemo, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { BacklogTask } from "@/hooks/useBacklogCommandCenter";

interface Props {
  tasks: BacklogTask[];
  loading: boolean;
  selectedTaskIds: Set<string>;
  onToggleTask: (id: string) => void;
  getReadiness: (task: BacklogTask) => { ready: boolean; hasDescription: boolean; hasEstimate: boolean; hasClient: boolean };
  getAgingHours: (createdAt: string) => number;
  clients: any[];
  taskToClients: Map<string, string[]>;
  companyId: string | undefined;
  selectionBar?: React.ReactNode;
  subtasksByParent?: Map<string, BacklogTask[]>;
}

export function BacklogBucket({
  tasks,
  loading,
  selectedTaskIds,
  onToggleTask,
  getReadiness,
  getAgingHours,
  clients,
  taskToClients,
  companyId,
  selectionBar,
  subtasksByParent = new Map(),
}: Props) {
  const [editingTask, setEditingTask] = useState<any>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const { updateTask } = useTasks();
  const queryClient = useQueryClient();

  const clientsMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null }>();
    clients.forEach((c: any) => map.set(c.id, { name: c.name, avatar: c.avatar }));
    return map;
  }, [clients]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTaskRow = (task: BacklogTask, isSubtask = false) => {
    const selected = selectedTaskIds.has(task.id);
    const readiness = getReadiness(task);
    const agingHours = getAgingHours(task.created_at);
    const minutes = task.ai_estimated_minutes || 18;
    const isRecurring = !!task.recurring_template_id;
    const agingDays = Math.floor(agingHours / 24);
    const subtasks = subtasksByParent.get(task.id) || [];
    const hasSubtasks = !isSubtask && subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);

    return (
      <Fragment key={task.id}>
        <TableRow
          className={cn(
            "cursor-pointer group",
            selected && "bg-primary/5",
            isSubtask && "bg-muted/30"
          )}
          onClick={() => onToggleTask(task.id)}
        >
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className={cn("flex items-center gap-1", isSubtask && "pl-6")}>
              {hasSubtasks && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(task.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              )}
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleTask(task.id)}
              />
            </div>
          </TableCell>
          <TableCell>
            {readiness.ready && <Zap className="w-3.5 h-3.5 text-warning" />}
            {isRecurring && !readiness.ready && <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />}
          </TableCell>
          <TableCell>
            <div className={cn(isSubtask && "pl-4")}>
              <div className="flex items-center gap-1.5">
                {isSubtask && <span className="text-muted-foreground text-xs">↳</span>}
                <p className="text-sm font-medium truncate max-w-[300px]">{task.title}</p>
                {hasSubtasks && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-1">
                    {subtasks.length} sub
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{task.description}</p>
              )}
            </div>
          </TableCell>
          <TableCell>
            {(() => {
              const clientIds = taskToClients.get(task.id) || [];
              if (clientIds.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
              const firstClient = clientsMap.get(clientIds[0]);
              if (!firstClient) return <span className="text-xs text-muted-foreground">—</span>;
              return (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5 flex-shrink-0">
                    <AvatarImage src={firstClient.avatar || undefined} alt={firstClient.name} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {firstClient.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground truncate max-w-[90px]">{firstClient.name}</span>
                  {clientIds.length > 1 && (
                    <span className="text-[10px] text-muted-foreground">+{clientIds.length - 1}</span>
                  )}
                </div>
              );
            })()}
          </TableCell>
          <TableCell>
            <Badge
              variant={task.priority === "high" ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0 h-4"
            >
              {task.priority === "high" ? "URGENTE" : task.priority === "medium" ? "Média" : "Baixa"}
            </Badge>
          </TableCell>
          <TableCell>
            {task.task_type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {task.task_type}
              </Badge>
            )}
          </TableCell>
          <TableCell>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              task.task_state === 'backlog' && "bg-muted text-muted-foreground",
              task.task_state === 'planejamento' && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              task.task_state === 'execucao' && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                task.task_state === 'backlog' && "bg-muted-foreground",
                task.task_state === 'planejamento' && "bg-amber-500",
                task.task_state === 'execucao' && "bg-emerald-500",
              )} />
              {task.task_state === 'backlog' ? 'Backlog' : task.task_state === 'planejamento' ? 'Planejamento' : 'Execução'}
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              {minutes}min
            </span>
          </TableCell>
          <TableCell className="text-right">
            {agingHours > 24 ? (
              <span className="text-xs text-destructive flex items-center justify-end gap-1">
                <AlertTriangle className="w-3 h-3" />
                {agingDays}d
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{agingHours}h</span>
            )}
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTask(task);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </TableCell>
        </TableRow>
        {/* Render subtasks if expanded */}
        {hasSubtasks && isExpanded && subtasks.map((sub) => renderTaskRow(sub, true))}
      </Fragment>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
      {selectionBar}
      <div className="flex-1 min-h-0 rounded-lg border bg-card shadow-sm overflow-hidden">
        <ScrollArea className="h-full">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">Backlog vazio</p>
            <p className="text-xs">Nenhuma tarefa aguardando distribuição</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[140px]">Cliente</TableHead>
                <TableHead className="w-[100px]">Prioridade</TableHead>
                <TableHead className="w-[80px]">Tipo</TableHead>
                <TableHead className="w-[90px]">Estado</TableHead>
                <TableHead className="w-[80px] text-right">Tempo</TableHead>
                <TableHead className="w-[100px] text-right">No backlog</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => renderTaskRow(task))}
            </TableBody>
          </Table>
        )}
        </ScrollArea>
      </div>

      {/* Quick Entry - bottom, ChatGPT style */}
      <BacklogQuickEntry clients={clients} companyId={companyId} />
      {/* Edit Task Dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        task={editingTask}
        onSave={async (data) => {
          if (editingTask) {
            await updateTask(editingTask.id, data);
            queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
            setEditingTask(null);
          }
        }}
      />
    </div>
  );
}
