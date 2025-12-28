import { TVTask } from "@/hooks/useTrafegoDashboard";
import { CheckCircle2, Clock, AlertCircle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TVTasksListProps {
  tasks: TVTask[];
}

const priorityConfig = {
  high: {
    label: "Alta",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  medium: {
    label: "Média",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  low: {
    label: "Baixa",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  alta: {
    label: "Alta",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  media: {
    label: "Média",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  baixa: {
    label: "Baixa",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
};

function formatDueDate(dateStr: string | null): { text: string; isOverdue: boolean } {
  if (!dateStr) return { text: "Sem prazo", isOverdue: false };
  
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return { text: "Hoje", isOverdue: false };
  }
  if (isTomorrow(date)) {
    return { text: "Amanhã", isOverdue: false };
  }
  if (isPast(date)) {
    return { text: `Atrasado`, isOverdue: true };
  }
  
  return { 
    text: format(date, "dd/MM", { locale: ptBR }), 
    isOverdue: false 
  };
}

export function TVTasksList({ tasks }: TVTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Tarefas Pendentes</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
          <p>Nenhuma tarefa pendente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Tarefas Pendentes</h2>
        <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-sm font-medium">
          {tasks.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const { text: dueDateText, isOverdue } = formatDueDate(task.dueDate);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-xl p-4 flex items-center gap-3 bg-muted/50",
                  isOverdue && "border-l-4 border-l-red-500"
                )}
              >
                {/* Priority indicator */}
                <div className={cn("p-1.5 rounded-lg", priority.bg)}>
                  {isOverdue ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className={cn("h-4 w-4", priority.color)} />
                  )}
                </div>
                
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  {task.clientName && (
                    <p className="text-sm text-muted-foreground truncate">{task.clientName}</p>
                  )}
                </div>
                
                {/* Due date */}
                <div className={cn(
                  "text-sm font-medium px-2 py-1 rounded-lg",
                  isOverdue ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                )}>
                  {dueDateText}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
