import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";

export default function AgentEdit() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { currentAgent, loadAgent, updateAgent } = useIAAgents();
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: ""
  });
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId]);

  useEffect(() => {
    if (currentAgent) {
      setFormData({
        agent_name: currentAgent.agent_name,
        description: currentAgent.description || "",
        prompt_base: currentAgent.prompt_base,
        additional_instructions: currentAgent.additional_instructions || ""
      });
    }
  }, [currentAgent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.prompt_base.length < 50) {
      setShowWarning(true);
      return;
    }

    if (agentId) {
      await updateAgent(agentId, formData);
      navigate(`/ia/agents/${agentId}`);
    }
  };

  if (!currentAgent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Carregando agente...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/ia/agents/${agentId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Editar Agente</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="agent_name">Nome do Agente *</Label>
            <Input
              id="agent_name"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição Resumida</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
              className="min-h-[200px]"
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
              className="min-h-[150px]"
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(`/ia/agents/${agentId}`)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
