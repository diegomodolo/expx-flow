import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, User, Edit, CheckCircle, MoreHorizontal } from "lucide-react";
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

interface TaskKanbanProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskKanban({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask }: TaskKanbanProps) {
  const columns = [
    { id: 'todo', title: 'Pendente', color: 'bg-gray-50' },
    { id: 'progress', title: 'Em Andamento', color: 'bg-blue-50' },
    { id: 'review', title: 'Em Revisão', color: 'bg-purple-50' },
    { id: 'done', title: 'Concluída', color: 'bg-green-50' },
  ];

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
      {columns.map((column) => {
        const columnTasks = tasks.filter(task => task.status === column.id);
        
        return (
          <div key={column.id} className="flex flex-col">
            <div className={`${column.color} p-4 rounded-t-lg border-b`}>
              <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                {column.title}
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </h3>
            </div>
            
            <div className="flex-1 p-4 space-y-4 bg-gray-50/50 min-h-[500px] rounded-b-lg">
              {columnTasks.map((task) => (
                <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium line-clamp-2 mb-2">
                          {task.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="secondary"
                            className={priorityColors[task.priority]}
                          >
                            {task.priority === 'low' ? 'Baixa' : 
                             task.priority === 'medium' ? 'Média' : 'Alta'}
                          </Badge>
                          <span className="text-lg" title={`Origem: ${task.origin}`}>
                            {originIcons[task.origin]}
                          </span>
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
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    {/* Progresso */}
                    {task.progress > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progresso</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    )}
                    
                    {/* Responsável */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.responsible_avatar} />
                        <AvatarFallback className="text-xs">
                          {task.responsible_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600 truncate">
                        {task.responsible_name}
                      </span>
                    </div>
                    
                    {/* Prazo */}
                    {task.due_date && (
                      <div className={`flex items-center gap-1 text-xs ${
                        isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {isOverdue(task.due_date) ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        <span>
                          {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {isOverdue(task.due_date) && (
                          <Badge variant="destructive" className="ml-1 text-xs py-0">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Equipe */}
                    {task.team && (
                      <div className="mt-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: task.team.color, color: task.team.color }}
                        >
                          {task.team.name}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {columnTasks.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-sm">Nenhuma tarefa</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}