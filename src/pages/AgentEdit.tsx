import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { AgentEditContent } from "@/components/agents/AgentEditContent";

export default function AgentEdit() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { createAgent } = useIAAgents();
  const [localAgentId, setLocalAgentId] = useState<string | null>(agentId || null);

  // Se estiver criando, cria um agente draft automaticamente
  useEffect(() => {
    const createDraftAgent = async () => {
      if (!agentId && !localAgentId) {
        const result = await createAgent({
          agent_name: "Novo Agente (Rascunho)",
          prompt_base: "Você é um assistente prestativo. Aguardando configuração completa.",
          description: "",
          additional_instructions: ""
        });
        
        if (result) {
          setLocalAgentId(result.id);
        }
      }
    };

    createDraftAgent();
  }, []);

  const currentId = agentId || localAgentId;

  if (!currentId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Inicializando agente...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Back button header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ia/agents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Voltar para Agentes</span>
        </div>

        <div className="flex-1 overflow-hidden">
          <AgentEditContent
            agentId={currentId}
            defaultSection={!agentId ? "geral" : "chat"}
            showChat={true}
            onSaved={() => {
              if (!agentId && currentId) {
                navigate(`/ia/agents/${currentId}/edit`);
              }
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
