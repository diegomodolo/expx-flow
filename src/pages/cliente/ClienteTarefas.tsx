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
import { useTasks } from "@/hooks/useTasks";
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

  // Filtrar tarefas do cliente
  const clientTasks = tasks.filter(task => task.related_client_id === clientId);

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
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
    </div>
  );
}
