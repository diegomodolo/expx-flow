import { ListTodo, CheckCircle2, Calendar, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { HealthTask } from "@/hooks/useHealthDashboard";

interface HealthTasksListProps {
  tasks: HealthTask[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const priorityConfig = {
  high: {
    label: "Alta",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  medium: {
    label: "Média",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  low: {
    label: "Baixa",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

function formatDueDate(dateStr: string | null): { label: string; isOverdue: boolean } {
  if (!dateStr) return { label: "Sem prazo", isOverdue: false };
  
  try {
    const date = parseISO(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      return { label: "Atrasado", isOverdue: true };
    }
    if (isToday(date)) {
      return { label: "Hoje", isOverdue: false };
    }
    if (isTomorrow(date)) {
      return { label: "Amanhã", isOverdue: false };
    }
    
    return { 
      label: format(date, "dd/MM", { locale: ptBR }), 
      isOverdue: false 
    };
  } catch {
    return { label: "Sem prazo", isOverdue: false };
  }
}

export function HealthTasksList({ tasks }: HealthTasksListProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <ListTodo className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Tarefas Pendentes</h3>
        {tasks.length > 0 && (
          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {tasks.slice(0, 5).map((task) => {
            const priority = priorityConfig[task.priority] || priorityConfig.medium;
            const dueDate = formatDueDate(task.dueDate);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg border",
                  dueDate.isOverdue 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-muted/30 border-border"
                )}
              >
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarImage src={task.clientAvatar || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(task.clientName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {task.clientName}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    priority.bg,
                    priority.color
                  )}>
                    {priority.label}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    dueDate.isOverdue 
                      ? "text-destructive" 
                      : "text-muted-foreground"
                  )}>
                    {dueDate.isOverdue ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {dueDate.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
