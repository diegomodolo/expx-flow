import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientTouchpoints } from "@/hooks/useClientTouchpoints";
import { Phone, Mail, MessageCircle, Calendar, Video, Plus } from "lucide-react";

interface CSNewTouchpointModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
  preselectedType?: string;
}

const touchpointTypes = [
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'meeting', label: 'Reunião', icon: Video },
  { value: 'qbr', label: 'QBR', icon: Calendar },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

export function CSNewTouchpointModal({ open, onOpenChange, clientId, clientName, preselectedType }: CSNewTouchpointModalProps) {
  const { createTouchpoint } = useClientTouchpoints();
  const [type, setType] = useState<string>(preselectedType || 'call');
  const [summary, setSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');

  // Update type when preselectedType changes
  useEffect(() => {
    if (preselectedType) {
      setType(preselectedType);
    }
  }, [preselectedType]);

  const handleSubmit = () => {
    if (!summary.trim()) return;

    createTouchpoint.mutate({
      clientId,
      touchpointType: type as any,
      summary,
      nextAction: nextAction || undefined,
      nextActionDate: nextActionDate || undefined,
    });

    // Reset form
    setSummary('');
    setNextAction('');
    setNextActionDate('');
    setType('call');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Registrar Touchpoint
          </DialogTitle>
          <DialogDescription>
            Registrar interação com {clientName || 'cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Contato</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {touchpointTypes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resumo da Interação *</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Descreva o que foi discutido..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Próxima Ação (opcional)</Label>
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ex: Enviar proposta de upsell"
            />
          </div>

          <div className="space-y-2">
            <Label>Data da Próxima Ação (opcional)</Label>
            <Input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!summary.trim() || createTouchpoint.isPending}
          >
            {createTouchpoint.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
