import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { ChatMessages } from "@/components/ai-chat/ChatMessages";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { AgentConversationsSidebar } from "@/components/agents/AgentConversationsSidebar";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

export default function AgentChat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useEmployeePermissions();
  const {
    currentAgent,
    conversations,
    currentConversation,
    messages,
    loading,
    loadAgent,
    createConversation,
    loadConversation,
    renameConversation,
    deleteConversation,
    sendMessage
  } = useIAAgents();

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId]);

  const handleSendMessage = async (message: string) => {
    if (!currentConversation) {
      // Criar nova conversa se não existir
      if (agentId) {
        await createConversation(agentId);
      }
    }
    await sendMessage(message);
  };

  const handleNewConversation = async () => {
    if (agentId) {
      await createConversation(agentId);
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
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ia/agents')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{currentAgent.agent_name}</h2>
              {currentAgent.description && (
                <p className="text-sm text-muted-foreground">{currentAgent.description}</p>
              )}
            </div>
          </div>
          {hasPermission('editar-agentes') && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/ia/agents/${agentId}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar Agente
            </Button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de Conversas */}
          <AgentConversationsSidebar
            conversations={conversations}
            currentConversation={currentConversation}
            onConversationSelect={loadConversation}
            onConversationDelete={deleteConversation}
            onConversationRename={renameConversation}
            onNewConversation={handleNewConversation}
          />

          {/* Área de Chat */}
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <ChatMessages messages={messages} loading={loading} />
                </div>
                <div className="border-t border-border p-4">
                  <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma conversa selecionada</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie uma nova conversa para começar a interagir com {currentAgent.agent_name}
                  </p>
                  <Button onClick={handleNewConversation}>
                    Nova Conversa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
