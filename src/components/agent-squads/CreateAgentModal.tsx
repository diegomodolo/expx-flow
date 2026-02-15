import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useClients } from "@/hooks/useClients";

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  onAgentCreated?: () => void;
}

export function CreateAgentModal({ open, onOpenChange, defaultClientId, onAgentCreated }: CreateAgentModalProps) {
  const { createAgent } = useIAAgents();
  const { clients } = useClients();
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: "",
    client_id: defaultClientId || "none",
  });

  const resetForm = () => {
    setFormData({
      agent_name: "",
      description: "",
      prompt_base: "",
      additional_instructions: "",
      client_id: defaultClientId || "none",
    });
    setShowWarning(false);
  };

  const handleSubmit = async () => {
    if (!formData.agent_name.trim()) return;

    if (formData.prompt_base.length < 50) {
      setShowWarning(true);
      return;
    }

    setSaving(true);
    try {
      const result = await createAgent({
        agent_name: formData.agent_name,
        description: formData.description || undefined,
        prompt_base: formData.prompt_base,
        additional_instructions: formData.additional_instructions || undefined,
        client_id: formData.client_id === "none" ? null : formData.client_id,
      });

      if (result) {
        resetForm();
        onOpenChange(false);
        onAgentCreated?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const sortedClients = [...(clients || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Agente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="modal_agent_name">Nome do Agente *</Label>
            <Input
              id="modal_agent_name"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              placeholder="Ex: Assistente de Marketing"
            />
          </div>

          <div>
            <Label htmlFor="modal_description">Descrição Resumida</Label>
            <Input
              id="modal_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descrição do agente (opcional)"
            />
          </div>

          <div>
            <Label htmlFor="modal_client_id">Cliente Associado (Opcional)</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum cliente específico</SelectItem>
                {sortedClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="modal_prompt_base">Prompt Base do Agente *</Label>
            <Textarea
              id="modal_prompt_base"
              value={formData.prompt_base}
              onChange={(e) => {
                setFormData({ ...formData, prompt_base: e.target.value });
                if (e.target.value.length >= 50) setShowWarning(false);
              }}
              placeholder="Descreva como o agente deve se comportar, seu tom de voz, especialidades..."
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.prompt_base.length}/50 caracteres mínimos
            </p>
          </div>

          <div>
            <Label htmlFor="modal_additional">Instruções Adicionais</Label>
            <Textarea
              id="modal_additional"
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
                O prompt deve ter no mínimo 50 caracteres.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.agent_name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Agente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
