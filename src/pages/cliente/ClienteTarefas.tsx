import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { handleAutoTimeTracking } from "@/utils/autoTimeTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { RecurringTasksManager } from "@/components/tasks/RecurringTasksManager";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { RecurringTaskDialog } from "@/components/tasks/RecurringTaskDialog";
import { TaskCompletionBlockModal } from "@/components/tasks/TaskCompletionBlockModal";
import { useTasks } from "@/hooks/useTasks";
import { useCompanyUsageDefaults, USAGE_KEYS } from "@/hooks/useCompanyUsageDefaults";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Kanban, Repeat, ListTodo } from "lucide-react";

interface ClienteTarefasProps {
  clientId: string;
  clientName: string;
}

export function ClienteTarefas({ clientId, clientName }: ClienteTarefasProps) {
  const { tasks, updateTask, deleteTask, createTask } = useTasks();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completionBlockOpen, setCompletionBlockOpen] = useState(false);
  const [completionBlockItems, setCompletionBlockItems] = useState<{ type: 'subtasks' | 'checklist'; count: number }[]>([]);
  const { getSetting } = useCompanyUsageDefaults();

  // Filtrar tarefas do cliente
  const clientTasks = tasks.filter(task => task.related_client_id === clientId);

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string, columnId?: string, columnName?: string) => {
    // Block completion if settings require it
    if (status === 'done') {
      const blockSubtasks = getSetting(USAGE_KEYS.BLOCK_FINISH_WITH_PENDING_SUBTASKS);
      const blockChecklist = getSetting(USAGE_KEYS.BLOCK_FINISH_WITH_PENDING_CHECKLIST);

      if (blockSubtasks || blockChecklist) {
        const existingTask = tasks.find(t => t.id === taskId);
        const pendingItems: { type: 'subtasks' | 'checklist'; count: number }[] = [];

        if (blockSubtasks) {
          const { data: subtasks } = await supabase
            .from('tasks')
            .select('id, status')
            .eq('parent_task_id', taskId)
            .neq('origin', 'ghost');
          const pendingSubtasks = (subtasks || []).filter((s: any) => s.status !== 'done');
          if (pendingSubtasks.length > 0) {
            pendingItems.push({ type: 'subtasks', count: pendingSubtasks.length });
          }
        }

        if (blockChecklist && existingTask) {
          let checklist = (existingTask as any).checklist || [];
          if (typeof checklist === 'string') {
            try { checklist = JSON.parse(checklist); } catch { checklist = []; }
          }
          if (!Array.isArray(checklist)) checklist = [];
          const pendingChecklist = checklist.filter((item: any) => !item.done && !item.completed);
          if (pendingChecklist.length > 0) {
            pendingItems.push({ type: 'checklist', count: pendingChecklist.length });
          }
        }

        if (pendingItems.length > 0) {
          setCompletionBlockItems(pendingItems);
          setCompletionBlockOpen(true);
          return;
        }
      }
    }

    const existingTask = tasks.find(t => t.id === taskId);
    if (existingTask && existingTask.status !== status) {
      await handleAutoTimeTracking(taskId, existingTask.status, status, user?.id, activeCompany?.company_id);
    }
    await updateTask(taskId, { status: status as any });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    await createTask({
      ...taskData,
      related_client_id: clientId,
    });
    setTaskDialogOpen(false);
  };

  const handleUpdateTask = async (taskData: any) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
      setSelectedTask(null);
      setTaskDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tarefas do Cliente</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie tarefas específicas de {clientName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRecurringDialogOpen(true)}
          >
            <Repeat className="h-4 w-4 mr-2" />
            Nova Recorrente
          </Button>
          <Button onClick={() => { setSelectedTask(null); setTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recorrentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {clientTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  Nenhuma tarefa para este cliente
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie tarefas manuais ou configure tarefas recorrentes
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRecurringDialogOpen(true)}
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Criar Recorrente
                  </Button>
                  <Button onClick={() => { setSelectedTask(null); setTaskDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Tarefa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TaskKanban
              tasks={clientTasks}
              onEditTask={handleEditTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </TabsContent>

        <TabsContent value="recurring" className="mt-4">
          <RecurringTasksManager clientId={clientId} />
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        task={selectedTask}
        defaultClientId={clientId}
      />

      <RecurringTaskDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        clientId={clientId}
      />

      <TaskCompletionBlockModal
        open={completionBlockOpen}
        onOpenChange={setCompletionBlockOpen}
        pendingItems={completionBlockItems}
      />
    </div>
  );
}
