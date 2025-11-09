import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Phone, Building2, DollarSign, User, GripVertical, MoreVertical, Settings, Trash2, Plus } from "lucide-react";
import { CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMKanbanBoardProps {
  stages: CRMStage[];
  leads: CRMLead[];
  onMoveCard: (leadId: string, toStageId: string, fromStageId: string) => void;
  onCardClick: (lead: CRMLead) => void;
  onEditStage?: (stage: CRMStage) => void;
  onDeleteStage?: (stageId: string) => void;
  onReorderStages?: (reorderedStages: CRMStage[]) => void;
  onCreateStage?: () => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'open':
      return { label: 'Aberto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'qualified':
      return { label: 'Qualificado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 'unqualified':
      return { label: 'Não Qualificado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    case 'won':
      return { label: 'Ganho', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'lost':
      return { label: 'Perdido', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
    default:
      return { label: 'Aberto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
  }
};

export function CRMKanbanBoard({ 
  stages, 
  leads, 
  onMoveCard, 
  onCardClick,
  onEditStage,
  onDeleteStage,
  onReorderStages,
  onCreateStage,
}: CRMKanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleLeadDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.stage_id !== toStageId) {
      onMoveCard(draggedLead.id, toStageId, draggedLead.stage_id);
    }
    
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleColumnDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderStages) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const reorderedStages = Array.from(stages);
    const [removed] = reorderedStages.splice(sourceIndex, 1);
    reorderedStages.splice(destIndex, 0, removed);
    
    onReorderStages(reorderedStages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DragDropContext onDragEnd={handleColumnDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-6 overflow-x-auto pb-4"
          >
            {stages.map((stage, index) => {
              const stageLeads = leads.filter(l => l.stage_id === stage.id);
              
              return (
                <Draggable key={stage.id} draggableId={stage.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "space-y-4 flex-shrink-0 w-80",
                        snapshot.isDragging && "opacity-50"
                      )}
                    >
                      {/* Header da Coluna */}
                      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div {...provided.dragHandleProps} className="cursor-move">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <h2 className="font-semibold text-foreground">{stage.name}</h2>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-2 py-0.5 bg-background"
                          >
                            {stageLeads.length}
                          </Badge>
                        </div>
                        
                        {(onEditStage || onDeleteStage) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEditStage && (
                                <DropdownMenuItem onClick={() => onEditStage(stage)}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Editar Coluna
                                </DropdownMenuItem>
                              )}
                              {onDeleteStage && (
                                <DropdownMenuItem 
                                  onClick={() => onDeleteStage(stage.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar Coluna
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      {/* Drop Zone para Leads */}
                      <div
                        className={cn(
                          "space-y-4 min-h-[400px] transition-colors rounded-lg p-2",
                          dragOverColumn === stage.id && "bg-primary/5 ring-2 ring-primary/20"
                        )}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setDragOverColumn(stage.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={(e) => handleLeadDrop(e, stage.id)}
                      >
                        {stageLeads.map(lead => (
                          <Card
                            key={lead.id}
                            className={cn(
                              "cursor-move hover:shadow-lg transition-all bg-card border border-border",
                              draggedLead?.id === lead.id && "opacity-50"
                            )}
                            draggable
                            onDragStart={() => setDraggedLead(lead)}
                            onDragEnd={() => setDraggedLead(null)}
                            onClick={() => onCardClick(lead)}
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* Header do Card */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {getInitials(lead.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm text-foreground">
                                      {lead.full_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(lead.created_at), {
                                        addSuffix: true,
                                        locale: ptBR
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              {lead.status && (
                                <Badge className={cn("text-xs", getStatusConfig(lead.status).color)}>
                                  {getStatusConfig(lead.status).label}
                                </Badge>
                              )}

                              {/* Informações de Contato */}
                              <div className="space-y-2 text-sm">
                                {lead.phone && (
                                  <p className="flex items-center text-muted-foreground">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {lead.phone}
                                  </p>
                                )}
                                {lead.email && (
                                  <p className="flex items-center text-muted-foreground">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {lead.email}
                                  </p>
                                )}
                                {lead.company_name && (
                                  <p className="flex items-center text-muted-foreground">
                                    <Building2 className="w-4 h-4 mr-2" />
                                    {lead.company_name}
                                  </p>
                                )}
                              </div>

                              {/* Valor */}
                              {lead.value && (
                                <div className="pt-2 border-t border-border">
                                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                                    <DollarSign className="w-4 h-4" />
                                    R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* Empty state */}
                        {stageLeads.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhum lead nesta etapa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            
            {/* Botão Nova Coluna */}
            {onCreateStage && (
              <div className="space-y-4 flex-shrink-0 w-80">
                <Button 
                  variant="outline" 
                  className="w-full h-[400px] border-dashed border-2 hover:border-primary hover:bg-primary/5"
                  onClick={onCreateStage}
                >
                  <Plus className="w-6 h-6 mr-2" />
                  Nova Coluna
                </Button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
