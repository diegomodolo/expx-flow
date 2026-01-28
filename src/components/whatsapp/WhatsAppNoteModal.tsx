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
import { useClientNotes } from "@/hooks/useClientNotes";
import { toast } from "sonner";

interface WhatsAppNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function WhatsAppNoteModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: WhatsAppNoteModalProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addNote } = useClientNotes(clientId);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      await addNote(content.trim());
      toast.success("Observação adicionada!");

      // Reset form and close
      setContent("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Erro ao adicionar observação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Observação</DialogTitle>
          <DialogDescription>
            Nota privada sobre {clientName} (visível apenas no sistema)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note-content">Observação *</Label>
            <Textarea
              id="note-content"
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
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Observação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
