import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface WhatsAppAISendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage: string;
  onSend: (message: string) => void;
  isSending?: boolean;
}

export function WhatsAppAISendDialog({
  isOpen,
  onClose,
  initialMessage,
  onSend,
  isSending = false,
}: WhatsAppAISendDialogProps) {
  const [message, setMessage] = useState(initialMessage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update message when initialMessage changes
  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        textareaRef.current?.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }, 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar resposta</DialogTitle>
          <DialogDescription>
            Revise e edite a mensagem antes de enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[150px] resize-none"
            disabled={isSending}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> para enviar
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
