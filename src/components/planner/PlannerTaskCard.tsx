import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Circle, Clock, AlertTriangle, Target, Timer, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Task } from "@/hooks/useTasks";
import { useTasks } from "@/hooks/useTasks";

interface PlannerTaskCardProps {
  task: Task;
  onEdit?: (task: any) => void;
  onDelete?: (taskId: string) => void;
}

export const PlannerTaskCard: React.FC<PlannerTaskCardProps> = ({ task, onEdit, onDelete }) => {
  const { updateTaskStatus, deleteTask } = useTasks();

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
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTaskStatus(task.id, nextStatus);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await deleteTask(task.id);
        onDelete?.(task.id);
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
      }
    }
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
            {getStatusIcon(task.status)}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{task.title}</h4>
              {task.start_date && (
                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title="Horário específico">
                  <Timer className="h-3 w-3" />
                  {format(new Date(task.start_date), 'HH:mm')}
                </div>
              )}
              {getOriginIcon(task.origin) && (
                <div title="Tarefa automática">{getOriginIcon(task.origin)}</div>
              )}
            </div>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getPriorityColor(task.priority)}
                  className="text-xs"
                >
                  {task.priority === 'high' ? 'Alta' : 
                   task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                
                {task.progress > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {task.progress}%
                  </span>
                )}
              </div>
              
              {task.responsible_name && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.responsible_avatar} />
                    <AvatarFallback className="text-xs">
                      {task.responsible_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {task.responsible_name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Menu de opções */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete} 
                className="cursor-pointer text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};