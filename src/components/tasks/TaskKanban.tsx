import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, CheckCircle2, ChevronRight, Plus, Settings, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTaskBoardColumns, TaskBoardColumn } from "@/hooks/useTaskBoardColumns";
import { ColumnSettingsDialog } from "./ColumnSettingsDialog";
import { TemplateSelector } from "./TemplateSelector";
import { KanbanTemplate } from "@/data/kanbanTemplates";

type TaskStatus = 'todo' | 'progress' | 'review' | 'done' | 'waiting_approval' | 'cancelled' | 'blocked' | 'paused';

interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  responsible_name: string;
  responsible_avatar?: string;
  due_date?: string;
  progress: number;
  origin: 'manual' | 'automation' | 'dashboard';
  related_campaign_id?: string;
  related_client_id?: string;
  quadro_column_id?: string | null;
  etapa?: string | null;
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
  onUpdateTaskStatus: (taskId: string, status: string, columnId?: string, columnName?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isCompactMode?: boolean;
}

// Default columns as fallback
const DEFAULT_COLUMNS: TaskBoardColumn[] = [
  { id: 'default-todo', name: 'Pendente', status: 'todo', color: '#6B7280', order_index: 0, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-progress', name: 'Em Andamento', status: 'progress', color: '#3B82F6', order_index: 1, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-review', name: 'Em Revisão', status: 'review', color: '#8B5CF6', order_index: 2, user_id: '', company_id: '', created_at: '', updated_at: '' },
  { id: 'default-done', name: 'Concluída', status: 'done', color: '#22C55E', order_index: 3, user_id: '', company_id: '', created_at: '', updated_at: '' },
];

export function TaskKanban({ tasks, onEditTask, onUpdateTaskStatus, onDeleteTask, isCompactMode = false }: TaskKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<TaskBoardColumn | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  
  // Column reordering state
  const [draggedColumn, setDraggedColumn] = useState<TaskBoardColumn | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const { 
    columns: userColumns, 
    isLoading: columnsLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    applyTemplate,
    isApplyingTemplate,
  } = useTaskBoardColumns();

  // Use user columns if available, otherwise fall back to defaults
  const columns = userColumns.length > 0 ? userColumns : DEFAULT_COLUMNS;
  const isUsingDefaults = userColumns.length === 0;

  const completedTasks = tasks.filter(task => task.status === 'done');

  const priorityColors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
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
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string, columnId?: string, columnName?: string) => {
    e.preventDefault();
    
    if (draggedTask && (draggedTask.status !== targetStatus || draggedTask.quadro_column_id !== columnId)) {
      onUpdateTaskStatus(draggedTask.id, targetStatus, columnId, columnName);
    }
    
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleOpenColumnDialog = (column?: TaskBoardColumn) => {
    setSelectedColumn(column || null);
    setColumnDialogOpen(true);
  };

  const handleSaveColumn = (data: { name: string; status: TaskStatus; color: string }) => {
    if (selectedColumn && selectedColumn.id && !selectedColumn.id.startsWith('default-')) {
      // Editing existing custom column
      updateColumn({ columnId: selectedColumn.id, updates: data });
    } else {
      // Creating new column (or converting default to custom)
      createColumn(data);
    }
    setColumnDialogOpen(false);
    setSelectedColumn(null);
  };

  const handleDeleteColumn = () => {
    if (selectedColumn && selectedColumn.id && !selectedColumn.id.startsWith('default-')) {
      deleteColumn(selectedColumn.id);
    }
    setColumnDialogOpen(false);
    setSelectedColumn(null);
  };

  // Column reordering handlers
  const handleColumnDragStart = (e: React.DragEvent, column: TaskBoardColumn) => {
    if (isUsingDefaults) return; // Can't reorder default columns
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'column'); // Mark as column drag
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumnId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    if (!draggedColumn) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDragEnter = (columnId: string) => {
    if (!draggedColumn) return;
    setDragOverColumnId(columnId);
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (!draggedColumn) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumnId(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumn: TaskBoardColumn) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn.id === targetColumn.id || isUsingDefaults) {
      setDraggedColumn(null);
      setDragOverColumnId(null);
      return;
    }

    // Calculate new order
    const currentColumns = [...columns];
    const draggedIndex = currentColumns.findIndex(c => c.id === draggedColumn.id);
    const targetIndex = currentColumns.findIndex(c => c.id === targetColumn.id);

    // Remove dragged column and insert at target position
    const [removed] = currentColumns.splice(draggedIndex, 1);
    currentColumns.splice(targetIndex, 0, removed);

    // Get the new order of column IDs
    const newOrder = currentColumns.map(c => c.id);
    reorderColumns(newOrder);

    setDraggedColumn(null);
    setDragOverColumnId(null);
  };

  // Render task card
  const renderTaskCard = (task: Task, columnColor: string, inModal = false) => (
    <Card 
      key={task.id} 
      className={cn(
        "shadow-google-sm hover:shadow-google-md transition-all border-l-4 bg-card",
        inModal ? 'cursor-pointer' : 'cursor-move',
        !inModal && draggedTask?.id === task.id && 'opacity-50 rotate-3 scale-105',
        isCompactMode ? "p-2" : "p-4"
      )}
      style={{ borderLeftColor: priorityColors[task.priority] }}
      draggable={!inModal}
      onDragStart={!inModal ? (e) => handleDragStart(e, task) : undefined}
      onDragEnd={!inModal ? handleDragEnd : undefined}
      onClick={inModal ? () => onEditTask(task) : undefined}
    >
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div className={cn("flex items-start flex-1", isCompactMode ? "gap-2" : "gap-3")}>
            <div 
              className={cn("rounded-full mt-1 flex-shrink-0", isCompactMode ? "w-2 h-2" : "w-3 h-3")}
              style={{ backgroundColor: priorityColors[task.priority] }}
            />
            
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium text-foreground leading-tight line-clamp-2",
                isCompactMode ? "text-xs mb-1" : "text-sm mb-2"
              )}>
                {task.title}
              </h4>

              {/* Ocultar cliente/campanha no modo compacto */}
              {!isCompactMode && (task.client?.name || task.campaign?.name) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {task.client?.name && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      👤 {task.client.name}
                    </span>
                  )}
                  {task.campaign?.name && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      📊 {task.campaign.name}
                    </span>
                  )}
                </div>
              )}
              
              {/* Ocultar descrição no modo compacto */}
              {!isCompactMode && task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
              
              {task.due_date && (
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1">
                     <Avatar className={cn(isCompactMode ? "h-3 w-3" : "h-4 w-4")}>
                       <AvatarImage 
                         src={task.responsible_avatar || task.user_profile?.avatar_url || ''} 
                         alt={task.responsible_name || 'Responsável'}
                         className="object-cover"
                       />
                       <AvatarFallback className={cn("bg-muted text-muted-foreground", isCompactMode ? "text-[6px]" : "text-[8px]")}>
                         {(task.responsible_name || 'U')?.charAt(0)?.toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                     {!isCompactMode && (
                       <span className="text-xs text-muted-foreground font-medium">
                         {task.responsible_name}
                       </span>
                     )}
                  </div>
                  
                  <p className={`text-xs font-medium ${
                    isOverdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatDateRelative(task.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
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
                className="text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const handleApplyTemplate = (template: KanbanTemplate) => {
    applyTemplate(template);
  };

  return (
    <>

      <div className={cn(
        "flex overflow-x-auto overflow-y-hidden",
        isCompactMode ? "gap-3 pb-2 h-[calc(100vh-200px)]" : "gap-6 pb-4 h-[calc(100vh-420px)]"
      )}>
        {/* Track which tasks have been assigned to prevent duplicates */}
        {(() => {
          const assignedTaskIds = new Set<string>();
          
          return columns.map((column, columnIndex) => {
            // Get tasks for this status that haven't been assigned yet
            const columnTasks = tasks.filter(task => {
              if (task.status !== column.status) return false;
              if (assignedTaskIds.has(task.id)) return false;
              return true;
            });
            
            // Mark these tasks as assigned (only for the first column of each status)
            const isFirstColumnOfStatus = columns.findIndex(c => c.status === column.status) === columnIndex;
            if (isFirstColumnOfStatus) {
              columnTasks.forEach(task => assignedTaskIds.add(task.id));
            } else {
              // For subsequent columns of the same status, show no tasks
              columnTasks.length = 0;
            }
            const isDropTarget = dragOverColumn === column.id;
            const canDrop = draggedTask && draggedTask.status !== column.status;
            const isDoneColumn = column.status === 'done';
            const isDefaultColumn = column.id.startsWith('default-');
            const isColumnDragTarget = dragOverColumnId === column.id && draggedColumn?.id !== column.id;
            const isBeingDragged = draggedColumn?.id === column.id;
            
            return (
              <div 
                key={column.id} 
                className={cn(
                  "flex flex-col flex-1 transition-all",
                  isCompactMode ? "min-w-[200px]" : "min-w-[280px]",
                  isBeingDragged && 'opacity-50 scale-95',
                  isColumnDragTarget && 'ring-2 ring-primary ring-offset-2 rounded-lg'
                )}
                onDragOver={handleColumnDragOver}
                onDragEnter={() => handleColumnDragEnter(column.id)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => {
                  // Only handle column drop if we're dragging a column
                  if (draggedColumn) {
                    handleColumnDrop(e, column);
                  }
                }}
            >
              <div 
                className={cn(
                  "rounded-t-lg border-b border-border flex items-center justify-between",
                  !isUsingDefaults && 'cursor-grab active:cursor-grabbing',
                  isCompactMode ? "p-2" : "p-4"
                )}
                style={{ backgroundColor: `${column.color}20` }}
                draggable={!isUsingDefaults}
                onDragStart={(e) => handleColumnDragStart(e, column)}
                onDragEnd={handleColumnDragEnd}
              >
                <h3 className={cn(
                  "font-semibold flex items-center gap-2",
                  isCompactMode && "text-sm"
                )} style={{ color: column.color }}>
                  {!isUsingDefaults && (
                    <span className="opacity-40 mr-1">⋮⋮</span>
                  )}
                  {column.name}
                  <Badge variant="secondary" className={cn("bg-background/80", isCompactMode && "text-xs px-1.5 py-0")}>{columnTasks.length}</Badge>
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("opacity-60 hover:opacity-100", isCompactMode ? "h-5 w-5" : "h-6 w-6")}
                  onClick={() => handleOpenColumnDialog(column)}
                  title="Configurações da coluna"
                >
                  <MoreHorizontal className={cn(isCompactMode ? "h-3 w-3" : "h-3.5 w-3.5")} />
                </Button>
              </div>
              
              <div 
                className={cn(
                  "flex-1 bg-muted/30 rounded-b-lg border border-t-0 border-border transition-colors overflow-y-auto",
                  isCompactMode ? "p-2 space-y-2" : "p-4 space-y-3",
                  isDropTarget && canDrop && 'bg-primary/10 border-2 border-primary border-dashed'
                )}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status, column.id.startsWith('default-') ? undefined : column.id, column.name)}
              >
                {isDoneColumn ? (
                  <>
                    {columnTasks.length > 0 ? (
                      <Card 
                        className="p-6 border cursor-pointer hover:shadow-google-md transition-all group"
                        style={{ 
                          background: `linear-gradient(135deg, ${column.color}10, ${column.color}20)`,
                          borderColor: `${column.color}40`
                        }}
                        onClick={() => setCompletedTasksModalOpen(true)}
                      >
                        <CardContent className="p-0 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div 
                              className="w-16 h-16 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${column.color}30` }}
                            >
                              <CheckCircle2 className="w-8 h-8" style={{ color: column.color }} />
                            </div>
                            <div>
                              <p className="text-3xl font-bold" style={{ color: column.color }}>
                                {columnTasks.length}
                              </p>
                              <p className="text-sm" style={{ color: column.color }}>
                                {columnTasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs group-hover:translate-x-1 transition-transform" style={{ color: column.color }}>
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
                    
                    {columnTasks.length > 0 && isDropTarget && canDrop && (
                      <div className="border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 text-center">
                        <p className="text-sm font-medium text-primary">Solte aqui para mover</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {columnTasks.map((task) => renderTaskCard(task, column.color))}
                    
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
        });
      })()}
        
        {/* Add Column Button */}
        <div className="flex flex-col min-w-[200px]">
          <Button
            variant="outline"
            className="h-14 border-dashed flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenColumnDialog()}
          >
            <Plus className="h-4 w-4" />
            Nova Coluna
          </Button>
        </div>
      </div>

      {/* Modal de tarefas concluídas */}
      <Dialog open={completedTasksModalOpen} onOpenChange={setCompletedTasksModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
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
                completedTasks.map((task) => renderTaskCard(task, '#22C55E', true))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Column Settings Dialog */}
      <ColumnSettingsDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        column={selectedColumn}
        onSave={handleSaveColumn}
        onDelete={handleDeleteColumn}
        isEditing={!!selectedColumn && !selectedColumn.id.startsWith('default-')}
      />

      {/* Template Selector Dialog */}
      <TemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onApplyTemplate={handleApplyTemplate}
        isApplying={isApplyingTemplate}
        hasExistingColumns={!isUsingDefaults}
      />
    </>
  );
}
