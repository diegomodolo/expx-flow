import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus } from "lucide-react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { PlannerTimeSlot as TimeSlot } from "@/hooks/usePlannerSlots";
import { Task } from "@/hooks/useTasks";
import { PlannerTaskCard } from "./PlannerTaskCard";

interface PlannerTimeSlotProps {
  slot: TimeSlot;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask?: (task: any) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const PlannerTimeSlot: React.FC<PlannerTimeSlotProps> = ({
  slot,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  console.log(`🎪 Rendering slot ${slot.name} with ${tasks.length} tasks:`, tasks.map(t => `${t.id}:${t.title}`));
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
    return tasks.filter(task => task.priority === priority).length;
  };

  return (
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg font-semibold text-foreground">{slot.name}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {slot.start_time} - {slot.end_time} • {getSlotDuration()}
            </p>
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
          </div>
        </div>
        
        {slot.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{slot.description}</p>
        )}
      </CardHeader>
      
      <CardContent>
        <Droppable droppableId={slot.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[120px] space-y-3 rounded-lg border-2 border-dashed p-4 transition-all duration-200 ${
                snapshot.isDraggingOver 
                  ? 'border-primary bg-primary/5 shadow-inner' 
                  : 'border-border/30 hover:border-border/50'
              }`}
            >
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhuma tarefa neste período</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Arraste tarefas aqui ou crie uma nova</p>
                </div>
              ) : (
                tasks.map((task, index) => (
                  <Draggable
                    key={`planner-task-${task.id}`}
                    draggableId={`planner-task-${task.id}`}
                    index={index}
                    isDragDisabled={!task.id}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${snapshot.isDragging ? 'opacity-75 rotate-2 scale-105 shadow-lg z-50' : ''}`}
                        style={{
                          ...provided.draggableProps.style,
                          transition: snapshot.isDragging ? 'none' : 'all 0.2s ease'
                        }}
                      >
                        <PlannerTaskCard 
                          task={task} 
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        
        {/* Add Task Button */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full border-2 border-dashed border-border/30 hover:border-primary hover:bg-primary/5 h-auto py-3 text-muted-foreground hover:text-primary transition-all duration-200"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};