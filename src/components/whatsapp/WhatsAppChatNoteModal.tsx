import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useWhatsAppConversationNotes } from "@/hooks/useWhatsAppConversationNotes";

interface WhatsAppChatNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  chatName: string;
}

export function WhatsAppChatNoteModal({
  open,
  onOpenChange,
  conversationId,
  chatName,
}: WhatsAppChatNoteModalProps) {
  const [content, setContent] = useState("");
  const { addNote } = useWhatsAppConversationNotes(conversationId);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    addNote.mutate(content.trim(), {
      onSuccess: () => {
        setContent("");
        onOpenChange(false);
      },
    });
  };

  const isValid = content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Observação</DialogTitle>
          <DialogDescription>
            Nota privada sobre o chat com {chatName} (visível apenas no sistema)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="chat-note-content">Observação *</Label>
            <Textarea
              id="chat-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Cliente prefere contato no período da manhã..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || addNote.isPending}>
            {addNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Observação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
