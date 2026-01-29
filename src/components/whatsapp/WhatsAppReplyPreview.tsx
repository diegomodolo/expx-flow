import { X, Reply, Image, FileText, Video, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { cn } from "@/lib/utils";

interface WhatsAppReplyPreviewProps {
  message: WhatsAppMessage;
  contactName?: string;
  onCancel: () => void;
}

export function WhatsAppReplyPreview({ 
  message, 
  contactName,
  onCancel 
}: WhatsAppReplyPreviewProps) {
  const isOutgoing = message.direction === "outgoing";
  const senderName = isOutgoing ? "Você" : (contactName || "Contato");
  
  const getMediaIcon = () => {
    switch (message.message_type) {
      case "image":
        return <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
      case "video":
        return <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
      case "audio":
        return <Headphones className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
      case "document":
        return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
      default:
        return null;
    }
  };

  const getContentPreview = () => {
    const mediaIcon = getMediaIcon();
    
    if (message.message_type === "image") {
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {mediaIcon}
          <span>Foto</span>
        </span>
      );
    }
    
    if (message.message_type === "video") {
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {mediaIcon}
          <span>Vídeo</span>
        </span>
      );
    }
    
    if (message.message_type === "audio") {
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {mediaIcon}
          <span>Áudio</span>
        </span>
      );
    }
    
    if (message.message_type === "document") {
      const fileName = message.content?.replace("📎 ", "").replace(/^\[.*\]\s*/, "").trim();
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {mediaIcon}
          <span className="truncate">{fileName || "Documento"}</span>
        </span>
      );
    }
    
    // Text message - truncate if too long
    const maxLength = 80;
    const content = message.content || "";
    return content.length > maxLength 
      ? content.substring(0, maxLength) + "..." 
      : content;
  };
  
  return (
    <div className="flex items-stretch gap-2 p-3 border-b bg-muted/30 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center shrink-0 text-muted-foreground">
        <Reply className="h-4 w-4" />
      </div>
      
      <div 
        className={cn(
          "flex-1 min-w-0 pl-3 border-l-2",
          isOutgoing ? "border-primary" : "border-emerald-500"
        )}
      >
        <p className={cn(
          "text-xs font-medium mb-0.5",
          isOutgoing ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
        )}>
          {senderName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {getContentPreview()}
        </p>
      </div>
      
      {/* Media thumbnail if image */}
      {message.message_type === "image" && message.media_url && (
        <div className="shrink-0 h-10 w-10 rounded overflow-hidden bg-muted">
          <img 
            src={message.cached_media_url || message.media_url} 
            alt="" 
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
