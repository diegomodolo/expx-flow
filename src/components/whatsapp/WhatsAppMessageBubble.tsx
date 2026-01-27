import { WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
}

export function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";
  
  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 shadow-sm",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted rounded-bl-none"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span className="text-xs">
            {format(new Date(message.sent_at), "HH:mm")}
          </span>
          {isOutgoing && (
            <MessageStatus status={message.status} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5" />;
    case "sent":
      return <Check className="h-3.5 w-3.5" />;
    case "pending":
      return <Check className="h-3.5 w-3.5 opacity-50" />;
    default:
      return null;
  }
}
