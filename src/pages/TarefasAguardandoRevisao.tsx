import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import {
  useTasksAwaitingReview,
  type ReviewTask,
} from "@/hooks/useTasksAwaitingReview";
import { useCompany } from "@/contexts/CompanyContext";
import { useTasks } from "@/hooks/useTasks";
import {
  ClipboardCheck,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const priorityConfig: Record<
  string,
  { label: string; className: string; icon: typeof AlertTriangle }
> = {
  high: {
    label: "Alta",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertTriangle,
  },
  medium: {
    label: "Média",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
  low: {
    label: "Baixa",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  review: {
    label: "Em Revisão",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  waiting_approval: {
    label: "Aguardando Aprovação",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

export default function TarefasAguardandoRevisao() {
  const { activeCompany } = useCompany();
  const { data: tasks = [], isLoading } = useTasksAwaitingReview();
  const { updateTask } = useTasks();

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, search, filterPriority, filterStatus]);

  const reviewCount = tasks.filter((t) => t.status === "review").length;
  const approvalCount = tasks.filter(
    (t) => t.status === "waiting_approval",
  ).length;

  const handleOpenTask = (task: ReviewTask) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async (taskData: unknown) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
      setSelectedTask(null);
      setTaskDialogOpen(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Tarefas Aguardando Revisão
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} pendente
              {tasks.length !== 1 ? "s" : ""} de revisão
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <ClipboardCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewCount}</p>
                <p className="text-xs text-muted-foreground">Em Revisão</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvalCount}</p>
                <p className="text-xs text-muted-foreground">
                  Aguardando Aprovação
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="review">Em Revisão</SelectItem>
              <SelectItem value="waiting_approval">
                Aguardando Aprovação
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {tasks.length === 0
                ? "Nenhuma tarefa aguardando revisão"
                : "Nenhuma tarefa encontrada com os filtros aplicados"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            {filtered.map((task) => {
              const priority =
                priorityConfig[task.priority] || priorityConfig.medium;
              const status = statusConfig[task.status] || statusConfig.review;
              const isOverdue =
                task.deadline && isPast(parseISO(task.deadline));

              return (
                <button
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.responsible_name}</span>
                      {task.team && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.team.color }}
                            />
                            {task.team.name}
                          </span>
                        </>
                      )}
                      {task.client && (
                        <>
                          <span>·</span>
                          <span>{task.client.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(parseISO(task.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] shrink-0", priority.className)}
                  >
                    {priority.label}
                  </Badge>

                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] shrink-0", status.className)}
                  >
                    {status.label}
                  </Badge>

                  {task.deadline && (
                    <span
                      className={cn(
                        "text-xs shrink-0 whitespace-nowrap",
                        isOverdue
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {isOverdue
                        ? "Atrasada"
                        : formatDistanceToNow(parseISO(task.deadline), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </DashboardLayout>
  );
}
