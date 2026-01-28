import { useState } from "react";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseWhatsAppFormatting } from "@/lib/whatsappFormatting";
import { Mic, Image, Video, FileText, Camera } from "lucide-react";

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
  const [showProfilePic, setShowProfilePic] = useState(false);
  const displayName = conversation.contact_name || formatPhoneNumber(conversation.phone);
  const initials = getInitials(displayName);
  const hasUnread = conversation.unread_count > 0;

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversation.profile_pic_url) {
      setShowProfilePic(true);
    }
  };

  // Format the preview message, handling media types
  const renderMessagePreview = () => {
    const preview = conversation.last_message_preview;
    
    if (!preview) {
      return <span className="text-muted-foreground">Sem mensagens</span>;
    }

    // Check for audio/voice message patterns
    if (
      preview.toLowerCase().includes("[audio]") ||
      preview.toLowerCase().includes("mensagem de voz") ||
      preview.toLowerCase().includes("voice_message") ||
      preview.toLowerCase().includes("[ptt]") ||
      preview.startsWith("🎤")
    ) {
      return (
        <span className="flex items-center gap-1">
          <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Mensagem de voz</span>
        </span>
      );
    }

    // Check for image patterns
    if (
      preview.toLowerCase().includes("[image]") ||
      preview.toLowerCase().includes("[imagem]") ||
      preview.startsWith("📷") ||
      preview.startsWith("🖼")
    ) {
      return (
        <span className="flex items-center gap-1">
          <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Foto</span>
        </span>
      );
    }

    // Check for video patterns
    if (
      preview.toLowerCase().includes("[video]") ||
      preview.toLowerCase().includes("[vídeo]") ||
      preview.startsWith("🎥") ||
      preview.startsWith("📹")
    ) {
      return (
        <span className="flex items-center gap-1">
          <Video className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Vídeo</span>
        </span>
      );
    }

    // Check for document patterns
    if (
      preview.toLowerCase().includes("[document]") ||
      preview.toLowerCase().includes("[documento]") ||
      preview.startsWith("📎") ||
      preview.startsWith("📄")
    ) {
      return (
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Documento</span>
        </span>
      );
    }

    // Regular text message
    return parseWhatsAppFormatting(preview);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
          isSelected && "bg-muted"
        )}
      >
        <Avatar 
          className={cn(
            "h-10 w-10 shrink-0",
            conversation.profile_pic_url && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          )}
          onClick={handleAvatarClick}
        >
          {conversation.profile_pic_url && (
            <AvatarImage 
              src={conversation.profile_pic_url} 
              alt={displayName}
              className="object-cover"
            />
          )}
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
              {renderMessagePreview()}
            </p>
            {hasUnread && (
              <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-xs shrink-0">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </button>

      {/* Modal para foto de perfil ampliada */}
      <Dialog open={showProfilePic} onOpenChange={setShowProfilePic}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
          <div className="flex flex-col items-center gap-4 p-4">
            {conversation.profile_pic_url && (
              <img
                src={conversation.profile_pic_url}
                alt={displayName}
                className="w-72 h-72 rounded-full object-cover shadow-2xl"
              />
            )}
            <span className="text-lg font-semibold text-white drop-shadow-lg">
              {displayName}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
