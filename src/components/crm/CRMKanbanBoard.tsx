import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, DollarSign, Zap } from "lucide-react";
import { CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { cn } from "@/lib/utils";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage_id === stage.id);
        
        return (
          <div key={stage.id} className="flex flex-col min-h-[400px]">
            {/* Header da Coluna */}
            <div 
              className="p-4 rounded-t-lg border-b-2"
              style={{ 
                backgroundColor: `${stage.color}15`,
                borderColor: stage.color,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{stage.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stageLeads.length}
                </Badge>
              </div>
              {stage.event_mapping && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3" />
                  <span>Envia: {stage.event_mapping}</span>
                </div>
              )}
            </div>
            
            {/* Drop Zone */}
            <div
              className={cn(
                "flex-1 p-2 space-y-2 bg-muted/30 rounded-b-lg border-2 border-transparent transition-colors",
                dragOverColumn === stage.id && "border-primary bg-primary/5"
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
                    "cursor-move hover:shadow-md transition-all",
                    draggedLead?.id === lead.id && "opacity-50"
                  )}
                  draggable
                  onDragStart={() => setDraggedLead(lead)}
                  onDragEnd={() => setDraggedLead(null)}
                  onClick={() => onCardClick(lead)}
                >
                  <CardContent className="p-3 space-y-2">
                    <h4 className="font-medium text-sm line-clamp-1">{lead.full_name}</h4>
                    
                    {lead.company_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span className="line-clamp-1">{lead.company_name}</span>
                      </div>
                    )}
                    
                    {lead.value && (
                      <div className="flex items-center gap-1 text-xs font-bold text-green-600">
                        <DollarSign className="w-3 h-3" />
                        <span>R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lead.email && <Mail className="w-3 h-3" />}
                      {lead.phone && <Phone className="w-3 h-3" />}
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {lead.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {/* Empty state */}
              {stageLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhum lead</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
