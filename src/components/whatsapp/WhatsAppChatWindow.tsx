import { useRef, useEffect } from "react";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";
import { WhatsAppMessageInput } from "./WhatsAppMessageInput";
import { WhatsAppMessagesLoading } from "./WhatsAppMessagesLoading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, RefreshCw } from "lucide-react";

interface WhatsAppChatWindowProps {
  conversation: WhatsAppConversation;
  companyId: string | undefined;
  instanceId?: string | null;
}

export function WhatsAppChatWindow({ conversation, companyId, instanceId }: WhatsAppChatWindowProps) {
  const { messages, isLoading, isFetchingFromApi, sendMessage, fetchMessagesFromApi } = useWhatsAppMessages(
    conversation.id,
    companyId
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const displayName = conversation.contact_name || formatPhoneNumber(conversation.phone);

  const handleSend = (message: string) => {
    sendMessage({ phone: conversation.phone, message });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Avatar className="h-10 w-10">
          {conversation.profile_pic_url && (
            <AvatarImage 
              src={conversation.profile_pic_url} 
              alt={displayName}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{displayName}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {formatPhoneNumber(conversation.phone)}
          </p>
        </div>
        
        {/* Refresh messages button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchMessagesFromApi(true)}
          disabled={isFetchingFromApi}
          title="Atualizar mensagens"
        >
          <RefreshCw className={`h-4 w-4 ${isFetchingFromApi ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <WhatsAppMessagesLoading />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Envie uma mensagem para iniciar a conversa
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMessagesFromApi(true)}
              disabled={isFetchingFromApi}
              className="mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingFromApi ? 'animate-spin' : ''}`} />
              Buscar mensagens anteriores
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((message) => (
              <WhatsAppMessageBubble key={message.id} message={message} instanceId={instanceId ?? null} />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <WhatsAppMessageInput onSend={handleSend} isSending={false} />
    </div>
  );
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/^55/, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function getInitials(name: string): string {
  if (/^\d+$/.test(name.replace(/[\s\-\(\)]/g, ""))) {
    const digits = name.replace(/\D/g, "");
    return digits.slice(-2);
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
