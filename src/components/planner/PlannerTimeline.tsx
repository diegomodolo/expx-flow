import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, FileText, Settings, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { usePlannerSlots } from "@/hooks/usePlannerSlots";
import { usePlannerTasks } from "@/hooks/usePlannerTasks";
import { useUnscheduledTasks } from "@/hooks/useUnscheduledTasks";
import { PlannerTimeSlot } from "./PlannerTimeSlot";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { PlannerSettingsModal } from "./PlannerSettingsModal";
import { TaskOrganizerModal } from "./TaskOrganizerModal";
import { OrganizationScopeModal } from "./OrganizationScopeModal";
import { OrganizingProgressModal } from "./OrganizingProgressModal";
import { useTaskOrganizer } from "@/hooks/useTaskOrganizer";
import { useTasks } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PlannerTimelineProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  filteredTasks?: any[];
}

export const PlannerTimeline: React.FC<PlannerTimelineProps> = ({ 
  selectedDate, 
  onDateChange,
  filteredTasks
 }) => {
  const { timeSlots, loading: slotsLoading } = usePlannerSlots();
  const { tasks: plannerTasks, getTasksBySlot, getTasksWithoutTime, loading: plannerLoading } = usePlannerTasks(selectedDate);
  const { unscheduledTasks, loading: unscheduledLoading } = useUnscheduledTasks();
  const { createTask, updateTask, deleteTask } = useTasks();
  const { employees } = useEmployees();
  const { toast } = useToast();
  
  // Usar tarefas filtradas se fornecidas, senão usar as do hook
  const tasks = filteredTasks || plannerTasks;

  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [editingTask, setEditingTask] = useState<any>(null);

  // Hook para organização com IA
  const {
    organizationPlan,
    isOrganizing,
    isApplying,
    organizingStep,
    organizingMessage,
    organizeTasksWithAI,
    applyOrganization,
    cancelOrganization,
  } = useTaskOrganizer();

  // Função para filtrar tarefas por slot específico e data selecionada
  const getFilteredTasksBySlot = (timeSlot: any) => {
    if (!tasks) return [];
    
    return tasks.filter((task: any) => {
      if (!task.start_date) return false;
      
      const taskDate = new Date(task.start_date);
      const taskTime = format(taskDate, 'HH:mm');
      const slotStart = timeSlot.start_time;
      const slotEnd = timeSlot.end_time;
      
      const isSameDay = format(taskDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      const isInTimeRange = taskTime >= slotStart && taskTime < slotEnd;
      
      return isSameDay && isInTimeRange;
    }).sort((a: any, b: any) => {
      // Priorizar tarefas com start_date definido
      if (a.start_date && !b.start_date) return -1;
      if (!a.start_date && b.start_date) return 1;
      if (a.start_date && b.start_date) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      return 0;
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const taskId = draggableId;
    const newSlotId = destination.droppableId;
    
    // Encontrar o slot de destino
    const targetSlot = timeSlots.find(slot => slot.id === newSlotId);
    if (!targetSlot) return;

    // Calcular novo horário baseado no slot
    const [hours, minutes] = targetSlot.start_time.split(':');
    const newStartDate = new Date(selectedDate);
    newStartDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await updateTask(taskId, {
        start_date: newStartDate.toISOString(),
        deadline: format(selectedDate, 'yyyy-MM-dd')
      });

      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

    } catch (error) {
      console.error("Erro ao mover tarefa:", error);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        // Se tem slot selecionado, configurar horário baseado no slot
        if (selectedSlotId) {
          const slot = timeSlots.find(s => s.id === selectedSlotId);
          if (slot && !taskData.start_date) {
            const [hours, minutes] = slot.start_time.split(':');
            const startDate = new Date(selectedDate);
            startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            taskData.start_date = startDate.toISOString();
          }
        }
        await createTask(taskData);
      }
      setTaskDialogOpen(false);
      setEditingTask(null);
      setSelectedSlotId("");
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleAddTask = (slotId: string) => {
    const slot = timeSlots.find(s => s.id === slotId);
    setSelectedSlotId(slotId);
    setEditingTask({
      team_id: "",
      title: "",
      description: slot?.description ? `Relacionado ao período: ${slot.name}` : "",
      priority: "medium",
      status: "todo",
      deadline: format(selectedDate, 'yyyy-MM-dd'),
    });
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Exportar resumo do dia
  const exportDaySummary = () => {
    try {
      const summary = generateDaySummary();
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resumo-${format(selectedDate, 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("Resumo exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar resumo:", error);
    }
  };

  const generateDaySummary = () => {
    const dateStr = format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    let summary = `RESUMO DIÁRIO - ${dateStr.toUpperCase()}\n`;
    summary += `${'='.repeat(50)}\n\n`;

    // Estatísticas gerais
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
    const pendingTasks = totalTasks - completedTasks;

    summary += `📊 ESTATÍSTICAS:\n`;
    summary += `• Total de tarefas: ${totalTasks}\n`;
    summary += `• Concluídas: ${completedTasks}\n`;
    summary += `• Pendentes: ${pendingTasks}\n`;
    summary += `• Taxa de conclusão: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%\n\n`;

    // Resumo por slot
    summary += `⏰ CRONOGRAMA:\n`;
    timeSlots.forEach(slot => {
      const slotTasks = getFilteredTasksBySlot(slot);
      summary += `\n${slot.start_time} - ${slot.end_time} | ${slot.name}\n`;
      summary += `${'-'.repeat(30)}\n`;
      
      if (slotTasks.length === 0) {
        summary += `  (Nenhuma tarefa agendada)\n`;
      } else {
        slotTasks.forEach(task => {
          const status = task.status === 'done' ? '✅' : '⏳';
          summary += `  ${status} ${task.title}\n`;
          if (task.description) {
            summary += `     ${task.description}\n`;
          }
        });
      }
    });

    // Tarefas sem horário definido
    const unscheduledTasks = getTasksWithoutTime();
    if (unscheduledTasks.length > 0) {
      summary += `\n📋 TAREFAS SEM HORÁRIO DEFINIDO:\n`;
      summary += `${'-'.repeat(30)}\n`;
      unscheduledTasks.forEach(task => {
        const status = task.status === 'done' ? '✅' : '⏳';
        summary += `  ${status} ${task.title}\n`;
      });
    }

    summary += `\n${'='.repeat(50)}\n`;
    summary += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;

    return summary;
  };

  // Organizar com IA - Abrir modal de escopo
  const handleOrganizeWithAI = () => {
    console.log('🚀 Starting AI organization...');
    console.log('📋 Unscheduled tasks:', unscheduledTasks.length);
    console.log('⏰ Available time slots:', timeSlots.length);
    
    if (unscheduledTasks.length === 0) {
      toast({
        title: "Nenhuma tarefa para organizar",
        description: "Todas as tarefas já possuem horários definidos.",
      });
      return;
    }

    if (timeSlots.length === 0) {
      toast({
        title: "Configure os slots primeiro",
        description: "É necessário ter slots de tempo configurados para organizar as tarefas.",
        variant: "destructive",
      });
      return;
    }

    setScopeModalOpen(true);
  };

  // Confirmar escopo e iniciar organização
  const handleConfirmScope = async (scope: any) => {
    let tasksToOrganize = [];

    if (scope.type === 'specific' && scope.employeeId) {
      // Filtrar tarefas do colaborador específico das tarefas não agendadas
      tasksToOrganize = unscheduledTasks.filter((task: any) => 
        task.user_id === scope.employeeId
      );
    } else {
      // Todas as tarefas sem horário definido
      tasksToOrganize = [...unscheduledTasks];
    }

    // Se incluir tarefas sem responsável, elas já estão em unscheduledTasks
    // Apenas garantir que não há duplicatas
    if (scope.includeUnassigned) {
      const unassignedTasks = unscheduledTasks.filter((task: any) => 
        !task.user_id
      );
      // Evitar duplicatas
      const unassignedNotInList = unassignedTasks.filter(unassigned =>
        !tasksToOrganize.some(task => task.id === unassigned.id)
      );
      tasksToOrganize = [...tasksToOrganize, ...unassignedNotInList];
    }

    await organizeTasksWithAI({
      tasks: tasksToOrganize,
      timeSlots,
      startDate: format(selectedDate, 'yyyy-MM-dd'),
      daysToOrganize: scope.includePeriod,
      scope,
      employees,
    });
  };

  if (slotsLoading || plannerLoading || unscheduledLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Carregando planner...</div>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum slot configurado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Configure os horários do seu dia para começar a organizar suas tarefas.
          </p>
          <Button onClick={() => setSettingsModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Slots
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com data selecionada e ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportDaySummary}
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              {/* Botão temporariamente oculto - funcionalidade mantida para futura implementação
              <Button
                variant="outline"
                size="sm"
                onClick={handleOrganizeWithAI}
                disabled={isOrganizing}
              >
                <Zap className="h-4 w-4 mr-2" />
                Organizar com IA
              </Button>
              */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline de slots com drag and drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {timeSlots.map((slot) => (
            <PlannerTimeSlot
              key={slot.id}
              slot={slot}
              tasks={getFilteredTasksBySlot(slot)}
              onAddTask={() => handleAddTask(slot.id)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Tarefas sem horário definido */}
      {getTasksWithoutTime().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tarefas sem horário ({getTasksWithoutTime().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getTasksWithoutTime().map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.responsible_name || 'Sem responsável'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTask(task)}
                  >
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            setSelectedSlotId("");
          }
        }}
        task={editingTask}
        onSave={handleCreateTask}
      />

      <PlannerSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />

      {/* Modal de Escopo da Organização */}
      <OrganizationScopeModal
        open={scopeModalOpen}
        onOpenChange={setScopeModalOpen}
        onConfirm={handleConfirmScope}
        onCancel={() => setScopeModalOpen(false)}
      />

      {/* Modal de Progresso da Organização */}
      <OrganizingProgressModal
        open={isOrganizing}
        currentStep={organizingStep}
        totalSteps={4}
        message={organizingMessage}
      />

      {/* Modal de Confirmação da Organização */}
      {organizationPlan && (
        <TaskOrganizerModal
          open={!!organizationPlan}
          onOpenChange={(open) => !open && cancelOrganization()}
          organizationPlan={organizationPlan}
          onApply={applyOrganization}
          onCancel={cancelOrganization}
          isApplying={isApplying}
        />
      )}
    </div>
  );
};