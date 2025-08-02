import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
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
    low: '#10B981', // green
    medium: '#F59E0B', // yellow/orange
    high: '#EF4444', // red
  };

  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const formatDateRelative = (dateString: string | undefined) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    } else if (isOverdue(dateString)) {
      return 'Atrasado';
    } else {
      return format(date, "dd/MM", { locale: ptBR });
    }
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
            
            <div className="flex-1 p-4 space-y-3 bg-gray-50/50 min-h-[500px] rounded-b-lg">
              {columnTasks.map((task) => (
                <Card key={task.id} className="p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4" 
                      style={{ borderLeftColor: priorityColors[task.priority] }}>
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Ponto colorido da prioridade */}
                        <div 
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: priorityColors[task.priority] }}
                        />
                        
                        <div className="flex-1 min-w-0">
                          {/* Título */}
                          <h4 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2">
                            {task.title}
                          </h4>
                          
                          {/* Descrição simplificada */}
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {task.description}
                            </p>
                          )}
                          
                          {/* Data relativa */}
                          {task.due_date && (
                            <p className={`text-xs font-medium ${
                              isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-400'
                            }`}>
                              {formatDateRelative(task.due_date)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Menu de ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditTask(task)}>
                            Editar
                          </DropdownMenuItem>
                          {task.status !== 'done' && (
                            <DropdownMenuItem onClick={() => onUpdateTaskStatus(task.id, 'done')}>
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