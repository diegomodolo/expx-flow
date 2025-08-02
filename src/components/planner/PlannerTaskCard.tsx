import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Circle, Clock, AlertTriangle, Target, Timer } from "lucide-react";
import { format } from "date-fns";
import { PlannerDailyTask } from "@/hooks/usePlannerTasks";
import { useTasks } from "@/hooks/useTasks";

interface PlannerTaskCardProps {
  task: PlannerDailyTask;
}

export const PlannerTaskCard: React.FC<PlannerTaskCardProps> = ({ task }) => {
  const { updateTaskStatus } = useTasks();
  
  if (!task.tasks) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'review': return <Target className="h-4 w-4 text-orange-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'automation': return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      default: return null;
    }
  };

  const handleStatusToggle = async () => {
    const nextStatus = task.tasks.status === 'done' ? 'todo' : 'done';
    await updateTaskStatus(task.tasks.id, nextStatus);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto"
            onClick={handleStatusToggle}
          >
            {getStatusIcon(task.tasks.status)}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{task.tasks.title}</h4>
              {task.tasks.start_date && (
                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title="Horário específico">
                  <Timer className="h-3 w-3" />
                  {format(new Date(task.tasks.start_date), 'HH:mm')}
                </div>
              )}
              {getOriginIcon(task.tasks.origin) && (
                <div title="Tarefa automática">{getOriginIcon(task.tasks.origin)}</div>
              )}
            </div>
            
            {task.tasks.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {task.tasks.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getPriorityColor(task.tasks.priority)}
                  className="text-xs"
                >
                  {task.tasks.priority === 'high' ? 'Alta' : 
                   task.tasks.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                
                {task.tasks.progress > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {task.tasks.progress}%
                  </span>
                )}
              </div>
              
              {task.tasks.responsible_name && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.tasks.responsible_avatar} />
                    <AvatarFallback className="text-xs">
                      {task.tasks.responsible_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {task.tasks.responsible_name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};