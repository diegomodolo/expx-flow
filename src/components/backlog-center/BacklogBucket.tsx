import { ScrollArea } from "@/components/ui/scroll-area";
import { BacklogQuickEntry } from "./BacklogQuickEntry";
import { Loader2, Inbox, Pencil, Clock, Zap, RotateCcw, AlertTriangle } from "lucide-react";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  companyId: string | undefined;
}

export function BacklogBucket({
  tasks,
  loading,
  selectedTaskIds,
  onToggleTask,
  getReadiness,
  getAgingHours,
  clients,
  companyId,
}: Props) {
  const [editingTask, setEditingTask] = useState<any>(null);
  const { updateTask } = useTasks();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
      {/* Quick Entry */}
      <BacklogQuickEntry clients={clients} companyId={companyId} />

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
                <TableHead className="w-[100px]">Prioridade</TableHead>
                <TableHead className="w-[80px]">Tipo</TableHead>
                <TableHead className="w-[80px] text-right">Tempo</TableHead>
                <TableHead className="w-[100px] text-right">No backlog</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const selected = selectedTaskIds.has(task.id);
                const readiness = getReadiness(task);
                const agingHours = getAgingHours(task.created_at);
                const minutes = task.ai_estimated_minutes || 18;
                const isRecurring = !!task.recurring_template_id;
                const agingDays = Math.floor(agingHours / 24);

                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "cursor-pointer group",
                      selected && "bg-primary/5"
                    )}
                    onClick={() => onToggleTask(task.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleTask(task.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {readiness.ready && <Zap className="w-3.5 h-3.5 text-warning" />}
                      {isRecurring && !readiness.ready && <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[300px]">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">{task.description}</p>
                      )}
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
                );
              })}
            </TableBody>
          </Table>
        )}
        </ScrollArea>
      </div>
      {/* Edit Task Dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        task={editingTask}
        onSave={async (data) => {
          if (editingTask) {
            await updateTask(editingTask.id, data);
            setEditingTask(null);
          }
        }}
      />
    </div>
  );
}
