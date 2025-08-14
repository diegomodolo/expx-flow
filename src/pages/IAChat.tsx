import React, { useState } from "react";
import { ClientSelector } from "@/components/ai-chat/ClientSelector";
import { ChatSidebar } from "@/components/ai-chat/ChatSidebar";
import { ChatMessages } from "@/components/ai-chat/ChatMessages";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { QuickActionsPanel } from "@/components/ai-chat/QuickActionsPanel";
import { useAIChat } from "@/hooks/useAIChat";
import { useCompany } from "@/contexts/CompanyContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function IAChat() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { activeCompany } = useCompany();
  
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    createConversation,
    sendMessage,
    loadConversation,
    deleteConversation
  } = useAIChat();

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId);
    // Create new conversation when client is selected
    if (clientId && activeCompany) {
      await createConversation(clientId);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    const clientId = await loadConversation(conversationId);
    if (clientId) {
      setSelectedClientId(clientId); // Sync selected client with loaded conversation
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedClientId || !currentConversation) return;
    await sendMessage(message);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Main Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-border bg-card">
            <ChatSidebar
              conversations={conversations}
              currentConversation={currentConversation}
              onConversationSelect={handleConversationSelect}
              onConversationDelete={deleteConversation}
              onNewConversation={() => {
                if (selectedClientId) {
                  createConversation(selectedClientId);
                }
              }}
              selectedClientId={selectedClientId}
              onClientSelect={handleClientSelect}
              companyId={activeCompany?.company_id}
            />
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col">
            {selectedClientId ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-hidden">
                  <ChatMessages
                    messages={messages}
                    loading={loading}
                  />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4 bg-card">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={!currentConversation || loading}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Selecione um cliente</h3>
                  <p>Escolha um cliente para iniciar uma conversa com a IA</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <QuickActionsPanel
            onSendMessage={handleSendMessage}
            selectedClientId={selectedClientId}
            disabled={!currentConversation || loading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}