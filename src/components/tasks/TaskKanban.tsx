import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, CheckCircle2, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard';
  related_campaign_id?: string;
  related_client_id?: string;
  team?: { name: string; color: string };
  user_profile?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  campaign?: any;
  client?: any;
}

interface TaskKanbanProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskKanban({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask }: TaskKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);

  const columns = [
    { id: 'todo', title: 'Pendente', color: 'bg-muted/60', headerColor: 'text-muted-foreground', accentColor: 'border-l-gray-400' },
    { id: 'progress', title: 'Em Andamento', color: 'bg-google-blue-50 dark:bg-google-blue-700/20', headerColor: 'text-google-blue-700 dark:text-google-blue-300', accentColor: 'border-l-google-blue-500' },
    { id: 'review', title: 'Em Revisão', color: 'bg-purple-50 dark:bg-purple-900/20', headerColor: 'text-purple-700 dark:text-purple-300', accentColor: 'border-l-purple-500' },
    { id: 'done', title: 'Concluída', color: 'bg-google-green-50 dark:bg-google-green-600/20', headerColor: 'text-google-green-600 dark:text-google-green-400', accentColor: 'border-l-google-green-500' },
  ];

  const completedTasks = tasks.filter(task => task.status === 'done');

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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: string) => {
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear dragOverColumn if leaving the column container, not child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (draggedTask && draggedTask.status !== targetStatus) {
      onUpdateTaskStatus(draggedTask.id, targetStatus);
    }
    
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Render task card (reusable for both kanban and modal)
  const renderTaskCard = (task: Task, inModal = false) => (
    <Card 
      key={task.id} 
      className={`p-4 shadow-google-sm hover:shadow-google-md transition-all ${inModal ? 'cursor-pointer' : 'cursor-move'} border-l-4 bg-card ${
        !inModal && draggedTask?.id === task.id ? 'opacity-50 rotate-3 scale-105' : ''
      }`}
      style={{ borderLeftColor: priorityColors[task.priority] }}
      draggable={!inModal}
      onDragStart={!inModal ? (e) => handleDragStart(e, task) : undefined}
      onDragEnd={!inModal ? handleDragEnd : undefined}
      onClick={inModal ? () => onEditTask(task) : undefined}
    >
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
              <h4 className="font-medium text-foreground text-sm leading-tight mb-2 line-clamp-2">
                {task.title}
              </h4>

              {/* Cliente e Campanha */}
              {(task.client?.name || task.campaign?.name) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {task.client?.name && (
                    <span className="text-xs bg-google-blue-100 dark:bg-google-blue-700/30 text-google-blue-700 dark:text-google-blue-300 px-2 py-0.5 rounded-full">
                      👤 {task.client.name}
                    </span>
                  )}
                  {task.campaign?.name && (
                    <span className="text-xs bg-google-green-100 dark:bg-google-green-600/30 text-google-green-600 dark:text-google-green-400 px-2 py-0.5 rounded-full">
                      📊 {task.campaign.name}
                    </span>
                  )}
                </div>
              )}
              
              {/* Descrição simplificada */}
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
              
              {/* Data relativa com responsável */}
              {task.due_date && (
                <div className="flex items-center gap-2">
                   {/* Avatar e nome do responsável */}
                   <div className="flex items-center gap-1">
                     <Avatar className="h-4 w-4">
                       <AvatarImage 
                         src={task.responsible_avatar || task.user_profile?.avatar_url || ''} 
                         alt={task.responsible_name || 'Responsável'}
                         className="object-cover"
                       />
                       <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                         {(task.responsible_name || 'U')?.charAt(0)?.toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                    <span className="text-xs text-muted-foreground font-medium">
                      {task.responsible_name}
                    </span>
                  </div>
                  
                  {/* Data relativa */}
                  <p className={`text-xs font-medium ${
                    isOverdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatDateRelative(task.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-muted"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                Editar
              </DropdownMenuItem>
              {task.status !== 'done' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateTaskStatus(task.id, 'done'); }}>
                  Marcar como Concluída
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                className="text-red-600"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
        {columns.map((column) => {
          const columnTasks = tasks.filter(task => task.status === column.id);
          const isDropTarget = dragOverColumn === column.id;
          const canDrop = draggedTask && draggedTask.status !== column.id;
          const isDoneColumn = column.id === 'done';
          
          return (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} p-4 rounded-t-lg border-b border-border`}>
                <h3 className={`font-semibold ${column.headerColor} flex items-center justify-between`}>
                  {column.title}
                  <Badge variant="secondary" className="bg-background/80">{columnTasks.length}</Badge>
                </h3>
              </div>
              
              <div 
                className={`flex-1 p-4 space-y-3 bg-muted/30 min-h-[500px] rounded-b-lg border border-t-0 border-border transition-colors ${
                  isDropTarget && canDrop ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
                }`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Coluna "Concluída" - mostrar card resumo */}
                {isDoneColumn ? (
                  <>
                    {columnTasks.length > 0 ? (
                      <Card 
                        className="p-6 bg-gradient-to-br from-google-green-50 to-google-green-100 dark:from-google-green-900/30 dark:to-google-green-800/20 border-google-green-200 dark:border-google-green-700/50 cursor-pointer hover:shadow-google-md transition-all group"
                        onClick={() => setCompletedTasksModalOpen(true)}
                      >
                        <CardContent className="p-0 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-google-green-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-8 h-8 text-google-green-600 dark:text-google-green-400" />
                            </div>
                            <div>
                              <p className="text-3xl font-bold text-google-green-700 dark:text-google-green-300">
                                {columnTasks.length}
                              </p>
                              <p className="text-sm text-google-green-600 dark:text-google-green-400">
                                {columnTasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-google-green-600 dark:text-google-green-400 group-hover:translate-x-1 transition-transform">
                              <span>Ver tarefas</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className={`text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed transition-colors ${
                        isDropTarget && canDrop ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}>
                        {isDropTarget && canDrop ? (
                          <>
                            <div className="text-4xl mb-2">📥</div>
                            <p className="text-sm font-medium">Solte aqui para mover</p>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-sm">Nenhuma tarefa concluída</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Drop zone indicator */}
                    {columnTasks.length > 0 && isDropTarget && canDrop && (
                      <div className="border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 text-center">
                        <p className="text-sm font-medium text-primary">Solte aqui para mover</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Colunas normais - mostrar cards de tarefas */}
                    {columnTasks.map((task) => renderTaskCard(task))}
                    
                    {/* Drop zone indicator when column is empty */}
                    {columnTasks.length === 0 && (
                      <div className={`text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed transition-colors ${
                        isDropTarget && canDrop ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}>
                        {isDropTarget && canDrop ? (
                          <>
                            <div className="text-4xl mb-2">📥</div>
                            <p className="text-sm font-medium">Solte aqui para mover</p>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl mb-2">📝</div>
                            <p className="text-sm">Nenhuma tarefa</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Drop zone indicator when dragging over non-empty column */}
                    {columnTasks.length > 0 && isDropTarget && canDrop && (
                      <div className="border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 text-center">
                        <p className="text-sm font-medium text-primary">Solte aqui para mover</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de tarefas concluídas */}
      <Dialog open={completedTasksModalOpen} onOpenChange={setCompletedTasksModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-google-green-600" />
              Tarefas Concluídas ({completedTasks.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                  <p>Nenhuma tarefa concluída ainda</p>
                </div>
              ) : (
                completedTasks.map((task) => renderTaskCard(task, true))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}