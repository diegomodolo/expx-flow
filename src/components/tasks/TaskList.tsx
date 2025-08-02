import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Edit, CheckCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard';
  team?: { name: string; color: string };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskList({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask }: TaskListProps) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    progress: 'bg-blue-100 text-blue-800',
    review: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    todo: 'Pendente',
    progress: 'Em Andamento',
    review: 'Em Revisão',
    done: 'Concluída',
  };

  const originIcons = {
    manual: '👤',
    automation: '🤖',
    dashboard: '📊',
  };

  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-sm transition-all duration-200 border-l-4 border-l-primary/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header com avatar e título */}
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  {task.responsible_name && 
                   task.responsible_name.trim() !== '' && 
                   task.responsible_name !== 'Equipe de Marketing' &&
                   (task.responsible_avatar || task.user_profile?.avatar_url) && (
                    <AvatarImage 
                      src={task.responsible_avatar || task.user_profile?.avatar_url || ''} 
                      alt={task.responsible_name}
                    />
                  )}
                  <AvatarFallback className="text-sm bg-primary/10 font-medium text-primary">
                    {task.responsible_name && 
                     task.responsible_name.trim() !== '' && 
                     task.responsible_name !== 'Equipe de Marketing'
                      ? task.responsible_name.split(' ').map(n => n[0]).join('') 
                      : task.title.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground leading-tight">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg" title={`Origem: ${task.origin}`}>
                          {originIcons[task.origin]}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {task.responsible_name}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEditTask(task)} className="cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {task.status !== 'done' && (
                          <DropdownMenuItem onClick={() => onUpdateTaskStatus(task.id, 'done')} className="cursor-pointer">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Concluída
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => onDeleteTask(task.id)}
                          className="cursor-pointer text-destructive hover:text-destructive"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
                
                <Badge 
                  variant={task.status === 'done' ? 'default' : 'secondary'}
                  className={`text-xs font-medium ${
                    task.status === 'done' ? 'bg-green-100 text-green-700' :
                    task.status === 'progress' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'review' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {statusLabels[task.status]}
                </Badge>
                
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
              {task.due_date && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {isOverdue(task.due_date) ? 
                      <Clock className="h-3 w-3 text-red-500" /> : 
                      <Calendar className="h-3 w-3" />
                    }
                    <span className={isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''}>
                      Prazo: {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      {isOverdue(task.due_date) && ' (Atrasado)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {tasks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma tarefa encontrada
            </h3>
            <p className="text-gray-500">
              Crie uma nova tarefa para começar a organizar seu trabalho.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}