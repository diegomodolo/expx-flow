import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Plus } from "lucide-react";
import { ChatMessages } from "@/components/ai-chat/ChatMessages";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { useIAAgents } from "@/hooks/useIAAgents";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SquadTestChatProps {
  squadId: string;
  squadName: string;
  /** If we want to test with a specific agent from the squad */
  agentId?: string;
}

export function SquadTestChat({ squadId, squadName, agentId }: SquadTestChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    currentAgent,
    conversations,
    currentConversation,
    messages,
    loading,
    loadAgent,
    createConversation,
    loadConversation,
    sendMessage,
  } = useIAAgents();

  useEffect(() => {
    if (agentId && isOpen) {
      loadAgent(agentId);
    }
  }, [agentId, isOpen]);

  const handleSendMessage = async (message: string) => {
    if (!currentConversation && agentId) {
      await createConversation(agentId);
    }
    await sendMessage(message);
  };

  const handleNewConversation = async () => {
    if (agentId) {
      await createConversation(agentId);
    }
  };

  if (!isOpen) {
    return (
      <div className="absolute bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-card h-full flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">Testar Squad</h3>
          <p className="text-xs text-muted-foreground truncate">{squadName}</p>
        </div>
        <div className="flex items-center gap-1">
          {agentId && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewConversation}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conversations list */}
      {conversations.length > 0 && (
        <div className="border-b">
          <ScrollArea className="max-h-32">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors",
                    currentConversation?.id === conv.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      {!agentId ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Selecione um agente líder na squad para iniciar o teste.
            </p>
          </div>
        </div>
      ) : !currentConversation ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Inicie uma conversa para testar a squad
            </p>
            <Button size="sm" onClick={handleNewConversation}>
              Nova Conversa
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">
            <ChatMessages messages={messages} loading={loading} />
          </div>
          <div className="border-t p-3">
            <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
          </div>
        </>
      )}
    </div>
  );
}
