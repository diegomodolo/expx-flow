import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Phone, Building2, DollarSign, User, GripVertical, MoreVertical, Settings, Trash2 } from "lucide-react";
import { CRMDeal, CRMStage } from "@/hooks/useCRMDeals";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMKanbanBoardProps {
  stages: CRMStage[];
  deals: CRMDeal[];
  onMoveCard: (dealId: string, toStageId: string, fromStageId: string) => void;
  onCardClick: (deal: CRMDeal) => void;
  onEditStage?: (stage: CRMStage) => void;
  onDeleteStage?: (stageId: string) => void;
  onReorderStages?: (reorderedStages: CRMStage[]) => void;
  onCreateStage?: () => void;
  movingDealIds?: Set<string>;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'open':
      return { label: 'Aberto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'qualified':
      return { label: 'Qualificado', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' };
    case 'unqualified':
      return { label: 'Não Qualificado', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'won':
      return { label: 'Ganho', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'lost':
      return { label: 'Perdido', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    default:
      return { label: 'Aberto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
  }
};

const getTemperatureConfig = (temperature: string | null | undefined) => {
  switch (temperature) {
    case 'hot':
      return { label: 'Quente', emoji: '🔥' };
    case 'warm':
      return { label: 'Morno', emoji: '🌡️' };
    case 'cold':
      return { label: 'Frio', emoji: '❄️' };
    default:
      return null;
  }
};

export function CRMKanbanBoard({ 
  stages, 
  deals, 
  onMoveCard, 
  onCardClick,
  onEditStage,
  onDeleteStage,
  onReorderStages,
  onCreateStage,
  movingDealIds = new Set(),
}: CRMKanbanBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<CRMDeal | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDealDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    
    if (draggedDeal && draggedDeal.stage_id !== toStageId) {
      onMoveCard(draggedDeal.id, toStageId, draggedDeal.stage_id);
    }
    
    setDraggedDeal(null);
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
              const stageDeals = deals.filter(d => d.stage_id === stage.id);
              const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
              
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
                      <div 
                        className="flex flex-col p-3 rounded-lg border-l-4 shadow-sm"
                        style={{ 
                          backgroundColor: `${stage.color}15`,
                          borderLeftColor: stage.color 
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div {...provided.dragHandleProps} className="cursor-move">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span 
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{ backgroundColor: stage.color }}
                            />
                            <h2 className="font-bold text-foreground text-base">{stage.name}</h2>
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5 font-semibold"
                              style={{ backgroundColor: `${stage.color}25`, color: stage.color }}
                            >
                              {stageDeals.length}
                            </Badge>
                            
                            {/* Indicadores de Automação */}
                            <div className="flex items-center gap-1">
                              {stage.set_status_on_enter && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0" title="Status automático ativo">
                                  📋
                                </Badge>
                              )}
                              {stage.set_temperature_on_enter && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-1.5 py-0" 
                                  title={`Temperatura automática: ${stage.set_temperature_on_enter}`}
                                >
                                  {stage.set_temperature_on_enter === 'hot' && '🔥'}
                                  {stage.set_temperature_on_enter === 'warm' && '🌡️'}
                                  {stage.set_temperature_on_enter === 'cold' && '❄️'}
                                </Badge>
                              )}
                              {stage.event_mapping && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0" title="Evento Meta ativo">
                                  📤
                                </Badge>
                              )}
                              {stage.workflow_enabled && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0" title="Workflow de duplicação ativo">
                                  🔄
                                </Badge>
                              )}
                            </div>
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
                        
                        {/* Total value in stage */}
                        {totalValue > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                      
                      {/* Drop Zone para Deals */}
                      <div
                        className={cn(
                          "space-y-4 min-h-[400px] transition-colors rounded-lg p-2",
                          dragOverColumn === stage.id && "bg-primary/5 ring-2 ring-primary/20"
                        )}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setDragOverColumn(stage.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={(e) => handleDealDrop(e, stage.id)}
                      >
                        {stageDeals.map(deal => {
                          const contact = deal.contact;
                          const contactName = contact?.full_name || deal.title;
                          const temperatureConfig = getTemperatureConfig(deal.temperature);
                          const responsible = deal.responsible;
                          
                          return (
                            <Card
                              key={deal.id}
                              className={cn(
                                "cursor-move hover:shadow-lg transition-all bg-card border border-border relative",
                                draggedDeal?.id === deal.id && "opacity-50",
                                movingDealIds.has(deal.id) && "animate-pulse ring-2 ring-primary/30"
                              )}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('dealId', deal.id);
                                setDraggedDeal(deal);
                              }}
                              onDragEnd={() => setDraggedDeal(null)}
                              onClick={() => onCardClick(deal)}
                            >
                              <CardContent className="p-4 space-y-3">
                                {/* Indicador de processamento */}
                                {movingDealIds.has(deal.id) && (
                                  <div className="absolute top-2 right-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  </div>
                                )}
                                
                                {/* Header do Card */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                      {responsible?.avatar_url ? (
                                        <AvatarImage src={responsible.avatar_url} alt={responsible.full_name} />
                                      ) : null}
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        {responsible ? getInitials(responsible.full_name) : getInitials(contactName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm text-foreground truncate">
                                        {deal.title}
                                      </p>
                                      {contact && contact.full_name !== deal.title && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {contact.full_name}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(deal.created_at), {
                                          addSuffix: true,
                                          locale: ptBR
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Temperature indicator */}
                                  {temperatureConfig && (
                                    <span title={temperatureConfig.label} className="text-sm">
                                      {temperatureConfig.emoji}
                                    </span>
                                  )}
                                </div>

                                {/* Status Badge */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={cn("text-xs", getStatusConfig(deal.status).color)}>
                                    {getStatusConfig(deal.status).label}
                                  </Badge>
                                </div>

                                {/* Informações de Contato */}
                                {contact && (
                                  <div className="space-y-1.5 text-sm">
                                    {contact.phone && (
                                      <p className="flex items-center text-muted-foreground text-xs">
                                        <Phone className="w-3 h-3 mr-1.5" />
                                        <span className="truncate">{contact.phone}</span>
                                      </p>
                                    )}
                                    {contact.email && (
                                      <p className="flex items-center text-muted-foreground text-xs">
                                        <Mail className="w-3 h-3 mr-1.5" />
                                        <span className="truncate">{contact.email}</span>
                                      </p>
                                    )}
                                    {contact.company_name && (
                                      <p className="flex items-center text-muted-foreground text-xs">
                                        <Building2 className="w-3 h-3 mr-1.5" />
                                        <span className="truncate">{contact.company_name}</span>
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Valor */}
                                {deal.value && (
                                  <div className="pt-2 border-t border-border">
                                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                                      <DollarSign className="w-4 h-4" />
                                      R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                        
                        {/* Empty state */}
                        {stageDeals.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhum negócio nesta etapa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
