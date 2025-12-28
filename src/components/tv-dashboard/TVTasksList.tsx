import { TVTask } from "@/hooks/useTrafegoDashboard";
import { CheckCircle2, Clock, AlertCircle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TVTasksListProps {
  tasks: TVTask[];
}

const priorityConfig = {
  high: { label: "Alta", color: "text-red-500", bg: "bg-red-500/10" },
  medium: { label: "Média", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  low: { label: "Baixa", color: "text-green-500", bg: "bg-green-500/10" },
  alta: { label: "Alta", color: "text-red-500", bg: "bg-red-500/10" },
  media: { label: "Média", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  baixa: { label: "Baixa", color: "text-green-500", bg: "bg-green-500/10" },
};

function formatDueDate(dateStr: string | null): { text: string; isOverdue: boolean } {
  if (!dateStr) return { text: "Sem prazo", isOverdue: false };
  
  const date = parseISO(dateStr);
  
  if (isToday(date)) return { text: "Hoje", isOverdue: false };
  if (isTomorrow(date)) return { text: "Amanhã", isOverdue: false };
  if (isPast(date)) return { text: "Atrasado", isOverdue: true };
  
  return { text: format(date, "dd/MM", { locale: ptBR }), isOverdue: false };
}

export function TVTasksList({ tasks }: TVTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Tarefas Pendentes</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mb-1 opacity-30" />
          <p className="text-xs">Nenhuma tarefa pendente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tarefas Pendentes</h2>
        <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs font-medium">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1">
          {tasks.slice(0, 5).map((task) => {
            const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const { text: dueDateText, isOverdue } = formatDueDate(task.dueDate);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-lg p-2 flex items-center gap-2 bg-muted/50",
                  isOverdue && "border-l-2 border-l-red-500"
                )}
              >
                <div className={cn("p-1 rounded-md", priority.bg)}>
                  {isOverdue ? (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Clock className={cn("h-3 w-3", priority.color)} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{task.title}</p>
                  {task.clientName && (
                    <p className="text-[10px] text-muted-foreground truncate">{task.clientName}</p>
                  )}
                </div>
                
                <div className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                  isOverdue ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                )}>
                  {dueDateText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
