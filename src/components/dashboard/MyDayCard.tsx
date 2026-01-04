import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  client_name?: string;
}

export function MyDayCard() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-day-tasks", activeCompany?.company_id, user?.id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !user?.id) return [];

      // Query tasks assigned to user OR created by user if not assigned to anyone
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          due_date,
          priority,
          status,
          related_client_id
        `)
        .eq("company_id", activeCompany.company_id)
        .or(`assigned_user_id.eq.${user.id},and(user_id.eq.${user.id},assigned_user_id.is.null)`)
        .in("status", ["todo", "progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(8);

      if (error) throw error;

      // Fetch client names separately
      const tasksWithClients: Task[] = [];
      for (const task of data || []) {
        let clientName: string | undefined;
        if (task.related_client_id) {
          const { data: client } = await supabase
            .from("clients")
            .select("name")
            .eq("id", task.related_client_id)
            .single();
          clientName = client?.name;
        }
        tasksWithClients.push({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          priority: task.priority,
          status: task.status,
          client_name: clientName,
        });
      }

      return tasksWithClients;
    },
    enabled: !!activeCompany?.company_id && !!user?.id,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "done" as any,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-day-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      toast.success("Tarefa concluída!");
    },
    onError: () => {
      toast.error("Erro ao concluir tarefa");
    },
  });

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return { label: "Sem prazo", color: "text-muted-foreground", isOverdue: false };
    
    const date = parseISO(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return { label: "Atrasada", color: "text-destructive", isOverdue: true };
    }
    if (isToday(date)) {
      return { label: "Hoje", color: "text-orange-600 dark:text-orange-400", isOverdue: false };
    }
    if (isTomorrow(date)) {
      return { label: "Amanhã", color: "text-blue-600 dark:text-blue-400", isOverdue: false };
    }
    return { 
      label: format(date, "dd/MM", { locale: ptBR }), 
      color: "text-muted-foreground",
      isOverdue: false 
    };
  };

  const priorityConfig: Record<string, { label: string; color: string }> = {
    high: { label: "Alta", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    medium: { label: "Média", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    low: { label: "Baixa", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  };

  const pendingToday = tasks.filter(t => {
    if (!t.due_date) return false;
    return isToday(parseISO(t.due_date));
  }).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Meu Dia</CardTitle>
          </div>
          {pendingToday > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {pendingToday} para hoje
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
            <p className="text-muted-foreground font-medium">
              Tudo em dia!
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Nenhuma tarefa pendente
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {tasks.map((task) => {
                const dueDateInfo = getDueDateInfo(task.due_date);
                const priority = priorityConfig[task.priority] || priorityConfig.medium;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-colors",
                      "hover:bg-muted/50",
                      dueDateInfo.isOverdue && "bg-red-50/50 dark:bg-red-950/20"
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      onCheckedChange={() => completeTask.mutate(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.client_name && (
                          <span className="text-xs text-muted-foreground">
                            {task.client_name}
                          </span>
                        )}
                        <Badge variant="secondary" className={cn("text-xs h-5", priority.color)}>
                          {priority.label}
                        </Badge>
                        <span className={cn("text-xs flex items-center gap-1", dueDateInfo.color)}>
                          {dueDateInfo.isOverdue && <AlertTriangle className="w-3 h-3" />}
                          <Clock className="w-3 h-3" />
                          {dueDateInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
