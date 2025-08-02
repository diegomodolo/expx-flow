import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { usePlannerSlots } from "@/hooks/usePlannerSlots";
import { usePlannerTasks } from "@/hooks/usePlannerTasks";
import { PlannerTimeSlot } from "./PlannerTimeSlot";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTasks } from "@/hooks/useTasks";

interface PlannerTimelineProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const PlannerTimeline: React.FC<PlannerTimelineProps> = ({ 
  selectedDate, 
  onDateChange 
}) => {
  const { timeSlots, loading: slotsLoading } = usePlannerSlots();
  const { plannerTasks, moveTask, getTasksBySlot } = usePlannerTasks(selectedDate);
  const { createTask, updateTask, deleteTask } = useTasks();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [editingTask, setEditingTask] = useState<any>(null);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const plannerTask = plannerTasks.find(pt => pt.task_id === draggableId);
    
    if (plannerTask && destination.droppableId !== plannerTask.time_slot_id) {
      moveTask(plannerTask.id, destination.droppableId);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
      }
      setTaskDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleAddTask = (slotId: string) => {
    setSelectedSlotId(slotId);
    setEditingTask(null);
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

  const exportDaySummary = () => {
    // TODO: Implementar exportação em PDF
    console.log("Exportar resumo do dia");
  };

  if (slotsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Carregando planner...</div>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum slot configurado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Configure slots de tempo nas configurações para começar a usar o planner.
          </p>
          <Button onClick={() => window.location.href = '/configuracoes/planner'}>
            Configurar Slots
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Planner - {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>
          </div>
          
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => onDateChange(new Date(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          />
        </div>
        
        <Button onClick={exportDaySummary} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Exportar Resumo
        </Button>
      </div>

      {/* Timeline */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {timeSlots.map((slot) => (
            <PlannerTimeSlot
              key={slot.id}
              slot={slot}
              tasks={getTasksBySlot(slot.id)}
              onAddTask={() => handleAddTask(slot.id)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
        task={editingTask}
        onSave={handleCreateTask}
      />
    </div>
  );
};