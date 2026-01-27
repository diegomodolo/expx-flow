import { useState } from "react";
import { Smile, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppReactionPickerProps {
  messageId: string | null; // external_id
  remoteJid: string; // phone@s.whatsapp.net
  companyId: string;
  instanceId: string | null;
  isOutgoing: boolean;
  currentReaction?: string | null;
  onReactionSent?: (emoji: string) => void;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function WhatsAppReactionPicker({
  messageId,
  remoteJid,
  companyId,
  instanceId,
  isOutgoing,
  currentReaction,
  onReactionSent,
}: WhatsAppReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(currentReaction || null);

  const handleReaction = async (emoji: string) => {
    if (!messageId || !instanceId) {
      toast.error("Não é possível reagir a esta mensagem");
      return;
    }

    setIsSending(true);
    
    // If clicking the same emoji, remove reaction (send empty string)
    const emojiToSend = emoji === selectedEmoji ? "" : emoji;

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-reaction", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          message_id: messageId,
          emoji: emojiToSend,
          remote_jid: remoteJid,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSelectedEmoji(emojiToSend || null);
        onReactionSent?.(emojiToSend);
        setIsOpen(false);
        
        if (emojiToSend) {
          toast.success(`Reação ${emojiToSend} enviada!`);
        } else {
          toast.success("Reação removida");
        }
      } else {
        throw new Error(data?.error || "Erro ao enviar reação");
      }
    } catch (err: any) {
      console.error("[WhatsAppReactionPicker] Error:", err);
      toast.error(err.message || "Erro ao enviar reação");
    } finally {
      setIsSending(false);
    }
  };

  if (!messageId || !instanceId) {
    return null;
  }

  // If there's a reaction but we're not showing the picker, just show the reaction
  // (reaction is shown on the bubble itself, picker is for adding/changing)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 transition-opacity",
            // Show if there's a current reaction or on hover
            selectedEmoji ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            isOutgoing 
              ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : selectedEmoji ? (
            <span className="text-sm">{selectedEmoji}</span>
          ) : (
            <Smile className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        side={isOutgoing ? "left" : "right"}
        align="center"
      >
        <div className="flex gap-1">
          {REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 text-lg hover:scale-125 transition-transform",
                selectedEmoji === emoji && "bg-muted ring-2 ring-primary"
              )}
              onClick={() => handleReaction(emoji)}
              disabled={isSending}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
