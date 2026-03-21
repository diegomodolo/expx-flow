import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hand, ClipboardCheck, ExternalLink } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useTasksAwaitingApproval,
  TaskAwaitingApproval,
} from "@/hooks/useTasksAwaitingApproval";

interface TaskApprovalItemProps {
  task: TaskAwaitingApproval;
  onClick: (task: TaskAwaitingApproval) => void;
}

function TaskApprovalItem({ task, onClick }: TaskApprovalItemProps) {
  return (
    <button
      onClick={() => onClick(task)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
    >
      <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
        <ClipboardCheck className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {task.title}
        </p>
        {task.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {task.body}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(task.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
    </button>
  );
}

interface TaskApprovalIndicatorProps {
  onOpenTask: (taskId: string, notificationId: string) => void;
}

export function TaskApprovalIndicator({
  onOpenTask,
}: TaskApprovalIndicatorProps) {
  const [open, setOpen] = useState(false);
  const { tasks, count } = useTasksAwaitingApproval();
  const navigate = useNavigate();

  if (count === 0) return null;

  const handleClick = (task: TaskAwaitingApproval) => {
    if (task.task_id) {
      onOpenTask(task.task_id, task.notification_id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Tarefas aguardando sua aprovação"
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
      <PopoverContent
        align="end"
        className="w-[380px] p-0 shadow-lg"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Aguardando sua aprovação
            </h4>
            <p className="text-xs text-muted-foreground">
              {count} tarefa{count !== 1 ? "s" : ""} para revisar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false);
              navigate("/tarefas-aguardando-revisao");
            }}
          >
            Ver todas
            <ExternalLink className="h-3 w-3" />
          </Button>
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
