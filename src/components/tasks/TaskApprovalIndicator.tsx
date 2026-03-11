import { useState } from "react";
import { Hand, ClipboardCheck, User, Building2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasksAwaitingApproval, TaskAwaitingApproval } from "@/hooks/useTasksAwaitingApproval";

interface TaskApprovalItemProps {
  task: TaskAwaitingApproval;
  onClick: (taskId: string) => void;
}

function TaskApprovalItem({ task, onClick }: TaskApprovalItemProps) {
  return (
    <button
      onClick={() => onClick(task.id)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
    >
      <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
        <ClipboardCheck className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.client_name && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {task.client_name}
            </span>
          )}
          {task.submitted_by && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.submitted_by}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(task.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </button>
  );
}

interface TaskApprovalIndicatorProps {
  onOpenTask: (taskId: string) => void;
}

export function TaskApprovalIndicator({ onOpenTask }: TaskApprovalIndicatorProps) {
  const [open, setOpen] = useState(false);
  const { tasks, count } = useTasksAwaitingApproval();

  if (count === 0) return null;

  const handleClick = (taskId: string) => {
    onOpenTask(taskId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10 rounded-full hover:bg-muted/60"
          title="Tarefas aguardando sua aprovação"
        >
          <Hand className="h-5 w-5 text-amber-500" />
          <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-amber-500 hover:bg-amber-500 text-white pointer-events-none">
            {count > 99 ? "99+" : count}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Aguardando sua aprovação</h4>
            <p className="text-xs text-muted-foreground">
              {count} tarefa{count !== 1 ? "s" : ""} para revisar
            </p>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskApprovalItem
                key={task.id}
                task={task}
                onClick={handleClick}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
