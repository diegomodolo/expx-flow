import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
    <Card className="hover:shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 border-l-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header com avatar e título */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage 
                src={task.responsible_avatar || `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face`} 
                alt={task.responsible_name || 'Responsável'}
                onError={(e) => {
                  console.log('🖼️ Erro ao carregar avatar:', task.responsible_avatar);
                  console.log('📝 Task responsável:', task.responsible_name);
                }}
                onLoad={() => {
                  console.log('✅ Avatar carregado com sucesso:', task.responsible_avatar);
                }}
              />
              <AvatarFallback className="text-sm bg-primary/10 font-medium text-primary">
                {task.responsible_name?.split(' ').map(n => n[0]).join('') || 'T'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-foreground leading-tight">{task.title}</h4>
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
              
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Tags e status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={getPriorityColor(task.priority)}
              className="text-xs font-medium"
            >
              {task.priority === 'high' ? 'Alta Prioridade' : 
               task.priority === 'medium' ? 'Média Prioridade' : 'Baixa Prioridade'}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-xs hover:bg-transparent"
              onClick={handleStatusToggle}
            >
              <Badge 
                variant={task.status === 'done' ? 'default' : 'secondary'}
                className={`text-xs font-medium ${
                  task.status === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                  task.status === 'progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                  task.status === 'review' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                  'bg-gray-100 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {task.status === 'done' ? 'Concluído' : 
                 task.status === 'progress' ? 'Em Andamento' : 
                 task.status === 'review' ? 'Em Revisão' : 'A Fazer'}
              </Badge>
            </Button>
            
            {task.progress > 0 && task.status !== 'done' && (
              <Badge variant="outline" className="text-xs font-medium">
                {task.progress}% Concluído
              </Badge>
            )}
            
            {task.team?.name && (
              <Badge 
                variant="outline" 
                className="text-xs font-medium"
                style={{ 
                  backgroundColor: `${task.team.color}20`,
                  borderColor: task.team.color,
                  color: task.team.color 
                }}
              >
                {task.team.name}
              </Badge>
            )}
          </div>

          {/* Datas */}
          {(task.start_date || task.due_date) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.start_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Início: {format(new Date(task.start_date), 'dd/MM/yyyy')}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Fim: {format(new Date(task.due_date), 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};