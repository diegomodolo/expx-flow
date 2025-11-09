import { CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, DollarSign, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMLeadDetailsModalProps {
  lead: CRMLead | null;
  stages: CRMStage[];
  isOpen: boolean;
  onClose: () => void;
}

export function CRMLeadDetailsModal({ lead, stages, isOpen, onClose }: CRMLeadDetailsModalProps) {
  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{lead.full_name}</DialogTitle>
          <DialogDescription>
            Detalhes do lead e histórico de movimentações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stage Atual */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Estágio Atual</p>
            <Badge 
              style={{ 
                backgroundColor: `${currentStage?.color}20`,
                color: currentStage?.color,
                borderColor: currentStage?.color,
              }}
              className="border"
            >
              {currentStage?.name}
            </Badge>
          </div>

          {/* Informações de Contato */}
          <div className="grid grid-cols-2 gap-4">
            {lead.email && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </div>
                <p className="text-sm font-medium">{lead.email}</p>
              </div>
            )}

            {lead.phone && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>Telefone</span>
                </div>
                <p className="text-sm font-medium">{lead.phone}</p>
              </div>
            )}

            {lead.company_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>Empresa</span>
                </div>
                <p className="text-sm font-medium">{lead.company_name}</p>
              </div>
            )}

            {lead.value && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Valor</span>
                </div>
                <p className="text-sm font-medium text-green-600">
                  R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          {/* Notas */}
          {lead.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>Observações</span>
              </div>
              <p className="text-sm bg-muted p-3 rounded-md">{lead.notes}</p>
            </div>
          )}

          {/* Motivo de Desqualificação */}
          {lead.disqualification_reason && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Motivo da Desqualificação</p>
              <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                {lead.disqualification_reason}
              </p>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Criado em</span>
              </div>
              <p className="text-sm font-medium">
                {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Atualizado em</span>
              </div>
              <p className="text-sm font-medium">
                {format(new Date(lead.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* ID Externo (para rastreamento) */}
          {lead.external_id && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                ID de Rastreamento: <span className="font-mono">{lead.external_id}</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
