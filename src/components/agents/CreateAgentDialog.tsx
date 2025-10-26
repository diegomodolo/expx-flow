import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useClients } from "@/hooks/useClients";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const { createAgent } = useIAAgents();
  const { clients } = useClients();
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: "",
    client_id: ""
  });
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    if (formData.prompt_base.length < 50) {
      setShowWarning(true);
      return;
    }

    const result = await createAgent({
      ...formData,
      client_id: formData.client_id || null
    });
    if (result) {
      // Aguarda um pouco para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onOpenChange(false);
      setFormData({
        agent_name: "",
        description: "",
        prompt_base: "",
        additional_instructions: "",
        client_id: ""
      });
      setShowWarning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Agente de IA</DialogTitle>
          <DialogDescription>
            Defina a personalidade e o comportamento do seu agente de IA
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="agent_name">Nome do Agente *</Label>
            <Input
              id="agent_name"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              placeholder="Ex: Assistente de Marketing"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição Resumida</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descrição do agente (opcional)"
            />
          </div>

          <div>
            <Label htmlFor="client_id">Cliente Associado (Opcional)</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum cliente específico</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Quando associado, o agente terá acesso automático ao briefing, campanhas e métricas deste cliente.
            </p>
          </div>

          <div>
            <Label htmlFor="prompt_base">Prompt Base do Agente *</Label>
            <Textarea
              id="prompt_base"
              value={formData.prompt_base}
              onChange={(e) => {
                setFormData({ ...formData, prompt_base: e.target.value });
                if (e.target.value.length >= 50) {
                  setShowWarning(false);
                }
              }}
              placeholder="Descreva como o agente deve se comportar, seu tom de voz, especialidades..."
              className="min-h-[150px]"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              {formData.prompt_base.length}/50 caracteres mínimos
            </p>
          </div>

          <div>
            <Label htmlFor="additional_instructions">Instruções Adicionais</Label>
            <Textarea
              id="additional_instructions"
              value={formData.additional_instructions}
              onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
              placeholder="Contexto adicional, regras específicas... (opcional)"
              className="min-h-[100px]"
            />
          </div>

          {showWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O prompt deve ter no mínimo 50 caracteres. Seja mais específico sobre como o agente deve se comportar.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Agente</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
