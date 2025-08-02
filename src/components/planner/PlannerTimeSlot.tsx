import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Settings } from "lucide-react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { PlannerTimeSlot as TimeSlot } from "@/hooks/usePlannerSlots";
import { PlannerDailyTask } from "@/hooks/usePlannerTasks";
import { PlannerTaskCard } from "./PlannerTaskCard";

interface PlannerTimeSlotProps {
  slot: TimeSlot;
  tasks: PlannerDailyTask[];
  onAddTask: () => void;
}

export const PlannerTimeSlot: React.FC<PlannerTimeSlotProps> = ({
  slot,
  tasks,
  onAddTask,
}) => {
  const getSlotDuration = () => {
    const start = new Date(`2000-01-01T${slot.start_time}`);
    const end = new Date(`2000-01-01T${slot.end_time}`);
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getPriorityCount = (priority: string) => {
    return tasks.filter(task => task.task?.priority === priority).length;
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">{slot.name}</CardTitle>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {slot.start_time} - {slot.end_time} ({getSlotDuration()})
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Priority indicators */}
            {getPriorityCount('high') > 0 && (
              <Badge variant="destructive" className="text-xs">
                {getPriorityCount('high')} Alta
              </Badge>
            )}
            {getPriorityCount('medium') > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getPriorityCount('medium')} Média
              </Badge>
            )}
            {getPriorityCount('low') > 0 && (
              <Badge variant="outline" className="text-xs">
                {getPriorityCount('low')} Baixa
              </Badge>
            )}
            
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {slot.description && (
          <p className="text-sm text-muted-foreground mt-2">{slot.description}</p>
        )}
      </CardHeader>
      
      <CardContent>
        <Droppable droppableId={slot.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] space-y-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
                snapshot.isDraggingOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted'
              }`}
            >
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma tarefa neste período</p>
                </div>
              ) : (
                tasks.map((plannerTask, index) => (
                  <Draggable
                    key={plannerTask.task_id}
                    draggableId={plannerTask.task_id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? 'opacity-50' : ''}
                      >
                        <PlannerTaskCard task={plannerTask} />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
              
              {/* Add Task Button */}
              <Button
                variant="ghost"
                className="w-full border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5"
                onClick={onAddTask}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tarefa
              </Button>
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};