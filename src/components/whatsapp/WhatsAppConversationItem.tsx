import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppConversationItemProps {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onClick: () => void;
}

export function WhatsAppConversationItem({
  conversation,
  isSelected,
  onClick,
}: WhatsAppConversationItemProps) {
  const displayName = conversation.contact_name || formatPhoneNumber(conversation.phone);
  const initials = getInitials(displayName);
  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("font-medium text-sm truncate", hasUnread && "font-semibold")}>
            {displayName}
          </span>
          {conversation.last_message_at && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_at), {
                addSuffix: false,
                locale: ptBR,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {conversation.last_message_preview || "Sem mensagens"}
          </p>
          {hasUnread && (
            <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-xs shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function formatPhoneNumber(phone: string): string {
  // Remove country code if present
  const cleaned = phone.replace(/^55/, "");
  
  // Format as (XX) XXXXX-XXXX for Brazilian numbers
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function getInitials(name: string): string {
  // If it's a phone number, return last 2 digits
  if (/^\d+$/.test(name.replace(/[\s\-()]/g, ""))) {
    const digits = name.replace(/\D/g, "");
    return digits.slice(-2);
  }
  
  // Otherwise get initials from name
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
