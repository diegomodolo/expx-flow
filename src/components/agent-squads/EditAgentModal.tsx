import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onAgentUpdated?: () => void;
}

export function EditAgentModal({ open, onOpenChange, agentId, onAgentUpdated }: EditAgentModalProps) {
  const { updateAgent } = useIAAgents();
  const { clients } = useClients();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: "",
    client_id: "none",
  });

  useEffect(() => {
    if (open && agentId) {
      setLoadingAgent(true);
      supabase
        .from("ia_agents")
        .select("*")
        .eq("id", agentId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setFormData({
              agent_name: data.agent_name || "",
              description: data.description || "",
              prompt_base: data.prompt_base || "",
              additional_instructions: data.additional_instructions || "",
              client_id: data.client_id || "none",
            });
          }
          setLoadingAgent(false);
        });
    }
  }, [open, agentId]);

  const handleSubmit = async () => {
    if (!formData.agent_name.trim()) return;

    if (formData.prompt_base.length < 50) {
      setShowWarning(true);
      return;
    }

    setSaving(true);
    try {
      await updateAgent(agentId, {
        agent_name: formData.agent_name,
        description: formData.description || null,
        prompt_base: formData.prompt_base,
        additional_instructions: formData.additional_instructions || null,
        client_id: formData.client_id === "none" ? null : formData.client_id,
      } as any);
      onOpenChange(false);
      onAgentUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const sortedClients = [...(clients || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agente</DialogTitle>
        </DialogHeader>

        {loadingAgent ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_agent_name">Nome do Agente *</Label>
                <Input
                  id="edit_agent_name"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                  placeholder="Ex: Assistente de Marketing"
                />
              </div>

              <div>
                <Label htmlFor="edit_description">Descrição Resumida</Label>
                <Input
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do agente (opcional)"
                />
              </div>

              <div>
                <Label htmlFor="edit_client_id">Cliente Associado (Opcional)</Label>
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
                <Label htmlFor="edit_prompt_base">Prompt Base do Agente *</Label>
                <Textarea
                  id="edit_prompt_base"
                  value={formData.prompt_base}
                  onChange={(e) => {
                    setFormData({ ...formData, prompt_base: e.target.value });
                    if (e.target.value.length >= 50) setShowWarning(false);
                  }}
                  placeholder="Descreva como o agente deve se comportar..."
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.prompt_base.length}/50 caracteres mínimos
                </p>
              </div>

              <div>
                <Label htmlFor="edit_additional">Instruções Adicionais</Label>
                <Textarea
                  id="edit_additional"
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
                Salvar Alterações
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
