import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/TaskDialog';

interface TaskMiniCardProps {
  taskId: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  todo: { label: 'A Fazer', icon: Circle, className: 'bg-muted text-muted-foreground' },
  progress: { label: 'Em Andamento', icon: Clock, className: 'bg-primary/10 text-primary' },
  review: { label: 'Revisão', icon: Clock, className: 'bg-warning/10 text-warning' },
  done: { label: 'Concluído', icon: CheckCircle2, className: 'bg-success/10 text-success' },
};

export function TaskMiniCard({ taskId }: TaskMiniCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: task } = useQuery({
    queryKey: ['task-mini', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, responsible_name')
        .eq('id', taskId)
        .single();

      if (error) return null;
      return data;
    },
    staleTime: 60000,
  });

  if (!task) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
        #{taskId.slice(0, 8)}...
      </span>
    );
  }

  const status = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = status.icon;

  return (
    <>
      <span
        onClick={() => setDialogOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-pointer',
          'border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors',
          'bg-card'
        )}
      >
        <StatusIcon className="w-3 h-3" />
        <span className="truncate max-w-[200px]">{task.title}</span>
        {task.responsible_name && (
          <span className="text-muted-foreground font-normal ml-1">· {task.responsible_name}</span>
        )}
      </span>

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={task}
          onSave={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
