import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Trash2, StopCircle } from "lucide-react";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { SquadChatMessages } from "@/components/agent-squads/SquadChatMessages";
import { useSquadChat } from "@/hooks/useSquadChat";

interface SquadTestChatProps {
  squadId: string;
  squadName: string;
  /** If we want to test with a specific agent from the squad */
  agentId?: string;
}

export function SquadTestChat({ squadId, squadName, agentId }: SquadTestChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, loading, sendMessage, clearMessages, stopExecution } = useSquadChat(squadId);

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
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearMessages}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat area */}
      {!agentId ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Defina um agente líder na squad para iniciar o teste.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">
            <SquadChatMessages messages={messages} loading={loading} />
          </div>
          <div className="border-t p-3 flex gap-2">
            <div className="flex-1">
              <ChatInput onSendMessage={sendMessage} disabled={loading} />
            </div>
            {loading && (
              <Button
                variant="destructive"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={stopExecution}
                title="Parar execução"
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
