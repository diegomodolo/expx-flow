import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Circle, Clock, AlertTriangle, Target } from "lucide-react";
import { PlannerDailyTask } from "@/hooks/usePlannerTasks";
import { useTasks } from "@/hooks/useTasks";

interface PlannerTaskCardProps {
  task: PlannerDailyTask;
}

export const PlannerTaskCard: React.FC<PlannerTaskCardProps> = ({ task }) => {
  const { updateTaskStatus } = useTasks();
  
  if (!task.task) return null;

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
    const nextStatus = task.task.status === 'done' ? 'todo' : 'done';
    await updateTaskStatus(task.task.id, nextStatus);
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
            {getStatusIcon(task.task.status)}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{task.task.title}</h4>
              {getOriginIcon(task.task.origin) && (
                <div title="Tarefa automática">{getOriginIcon(task.task.origin)}</div>
              )}
            </div>
            
            {task.task.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {task.task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getPriorityColor(task.task.priority)}
                  className="text-xs"
                >
                  {task.task.priority === 'high' ? 'Alta' : 
                   task.task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                
                {task.task.progress > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {task.task.progress}%
                  </span>
                )}
              </div>
              
              {task.task.responsible_name && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.task.responsible_avatar} />
                    <AvatarFallback className="text-xs">
                      {task.task.responsible_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {task.task.responsible_name.split(' ')[0]}
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