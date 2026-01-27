import { WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, AlertCircle, Download, FileText, Image, Video, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
}

export function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";
  const isFailed = message.status === "failed";
  const hasMedia = !!message.media_url;
  const isMediaType = ["image", "video", "audio", "document"].includes(message.message_type);
  
  const handleDownload = () => {
    if (message.media_url) {
      window.open(message.media_url, "_blank");
    }
  };

  const getMediaIcon = () => {
    switch (message.message_type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Headphones className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getMediaLabel = () => {
    switch (message.message_type) {
      case "image":
        return "Imagem";
      case "video":
        return "Vídeo";
      case "audio":
        return "Áudio";
      case "document":
        return "Documento";
      default:
        return "Arquivo";
    }
  };
  
  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 shadow-sm",
          isOutgoing
            ? isFailed 
              ? "bg-destructive/20 text-foreground rounded-br-none border border-destructive/30"
              : "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted rounded-bl-none"
        )}
      >
        {/* Media preview/download area */}
        {isMediaType && hasMedia && (
          <div className="mb-2">
            {message.message_type === "image" ? (
              <div className="relative">
                <img 
                  src={message.media_url!} 
                  alt="Imagem" 
                  className="rounded max-w-full max-h-60 object-cover cursor-pointer"
                  onClick={handleDownload}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-8 w-8 opacity-80 hover:opacity-100"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant={isOutgoing && !isFailed ? "secondary" : "outline"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleDownload}
              >
                {getMediaIcon()}
                <span className="flex-1 text-left truncate">
                  {message.content.startsWith("📎") || message.content.startsWith("[") 
                    ? message.content.replace("📎 ", "").replace(/^\[.*\]$/, getMediaLabel())
                    : message.content.substring(0, 30)}
                </span>
                <Download className="h-4 w-4 shrink-0" />
              </Button>
            )}
          </div>
        )}

        {/* Text content - hide if it's just a placeholder for media with download button */}
        {!(isMediaType && hasMedia && (message.content.startsWith("📎") || message.content.startsWith("["))) && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Media without URL - show content as is */}
        {isMediaType && !hasMedia && (
          <div className="flex items-center gap-2 text-sm opacity-80">
            {getMediaIcon()}
            <span>{message.content}</span>
          </div>
        )}

        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isOutgoing 
            ? isFailed 
              ? "text-destructive" 
              : "text-primary-foreground/70" 
            : "text-muted-foreground"
        )}>
          <span className="text-xs">
            {format(new Date(message.sent_at), "HH:mm")}
          </span>
          {isOutgoing && (
            <MessageStatus status={message.status} />
          )}
        </div>
        {isFailed && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Falha ao enviar
          </p>
        )}
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
    case "sending":
      return <Clock className="h-3.5 w-3.5 opacity-70" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "pending":
      return <Check className="h-3.5 w-3.5 opacity-50" />;
    default:
      return null;
  }
}
