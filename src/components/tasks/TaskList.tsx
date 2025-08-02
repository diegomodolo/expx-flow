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

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {task.title}
                  </h3>
                  <span className="text-lg" title={`Origem: ${task.origin}`}>
                    {originIcons[task.origin]}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-gray-600 mb-3">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={statusColors[task.status]}>
                    {statusLabels[task.status]}
                  </Badge>
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority === 'low' ? 'Baixa' : 
                     task.priority === 'medium' ? 'Média' : 'Alta'}
                  </Badge>
                  {task.team && (
                    <Badge 
                      variant="outline"
                      style={{ borderColor: task.team.color, color: task.team.color }}
                    >
                      {task.team.name}
                    </Badge>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEditTask(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  {task.status !== 'done' && (
                    <DropdownMenuItem onClick={() => onUpdateTaskStatus(task.id, 'done')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Concluída
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onDeleteTask(task.id)}
                    className="text-red-600"
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Responsável */}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={task.responsible_avatar} />
                  <AvatarFallback className="text-sm">
                    {task.responsible_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {task.responsible_name}
                  </p>
                  <p className="text-xs text-gray-500">Responsável</p>
                </div>
              </div>
              
              {/* Prazo */}
              <div className="flex items-center gap-2">
                {task.due_date ? (
                  <>
                    {isOverdue(task.due_date) ? 
                      <Clock className="h-4 w-4 text-red-500" /> : 
                      <Calendar className="h-4 w-4 text-gray-400" />
                    }
                    <div>
                      <p className={`text-sm font-medium ${
                        isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isOverdue(task.due_date) ? 'Atrasado' : 'Prazo'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-gray-400">Sem prazo</p>
                    <p className="text-xs text-gray-500">Prazo</p>
                  </div>
                )}
              </div>
              
              {/* Progresso */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Progresso</span>
                  <span className="font-medium">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>
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