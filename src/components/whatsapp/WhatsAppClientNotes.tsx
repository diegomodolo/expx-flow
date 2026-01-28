import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClientNotes } from "@/hooks/useClientNotes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StickyNote, X, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppClientNotesProps {
  clientId: string;
  clientName: string;
  className?: string;
}

export function WhatsAppClientNotes({
  clientId,
  clientName,
  className,
}: WhatsAppClientNotesProps) {
  const { notes, profilesByUserId, loading, deleteNote } = useClientNotes(clientId);

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success("Observação removida");
    } catch (error) {
      toast.error("Erro ao remover observação");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return null; // Don't show loading state in header
  }

  if (notes.length === 0) {
    return null; // Don't show anything if no notes
  }

  return (
    <div className={cn("border-b bg-muted/40", className)}>
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Observações sobre {clientName}
          </span>
        </div>
        <ScrollArea className={notes.length > 2 ? "max-h-32" : undefined}>
          <div className="space-y-2">
            {notes.map((note) => {
              const profile = profilesByUserId[note.user_id];
              return (
                <div
                  key={note.id}
                  className="group flex items-start gap-2 p-2 rounded-md bg-background border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {profile?.full_name || "Usuário"}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(note.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(note.id)}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
