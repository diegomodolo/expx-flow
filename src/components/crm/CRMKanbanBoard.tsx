import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, DollarSign, Zap, MoreHorizontal, User } from "lucide-react";
import { CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMKanbanBoardProps {
  stages: CRMStage[];
  leads: CRMLead[];
  onMoveCard: (leadId: string, toStageId: string, fromStageId: string) => void;
  onCardClick: (lead: CRMLead) => void;
}

export function CRMKanbanBoard({ stages, leads, onMoveCard, onCardClick }: CRMKanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.stage_id !== toStageId) {
      onMoveCard(draggedLead.id, toStageId, draggedLead.stage_id);
    }
    
    setDraggedLead(null);
    setDragOverColumn(null);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage_id === stage.id);
        
        return (
          <div key={stage.id} className="space-y-4">
            {/* Header da Coluna */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h2 className="font-semibold text-foreground">{stage.name}</h2>
              </div>
              <Badge 
                variant="secondary" 
                className="text-sm px-2 py-1 bg-muted font-medium"
              >
                {stageLeads.length} Lead{stageLeads.length !== 1 && 's'}
              </Badge>
            </div>
            
            {/* Drop Zone */}
            <div
              className={cn(
                "space-y-4 min-h-[400px] transition-colors rounded-lg",
                dragOverColumn === stage.id && "bg-primary/5"
              )}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverColumn(stage.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

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
                        <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                          <DollarSign className="w-4 h-4" />
                          R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    {lead.disqualification_reason && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-2 py-1 bg-destructive/10 text-destructive"
                      >
                        Desqualificado
                      </Badge>
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
        );
      })}
    </div>
  );
}
