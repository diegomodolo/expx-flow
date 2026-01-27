import { useRef, useEffect } from "react";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";
import { WhatsAppMessageInput } from "./WhatsAppMessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Phone } from "lucide-react";

interface WhatsAppChatWindowProps {
  conversation: WhatsAppConversation;
  companyId: string | undefined;
}

export function WhatsAppChatWindow({ conversation, companyId }: WhatsAppChatWindowProps) {
  const { messages, isLoading, sendMessage, isSending } = useWhatsAppMessages(
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
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Envie uma mensagem para iniciar a conversa
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((message) => (
              <WhatsAppMessageBubble key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <WhatsAppMessageInput onSend={handleSend} isSending={isSending} />
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
