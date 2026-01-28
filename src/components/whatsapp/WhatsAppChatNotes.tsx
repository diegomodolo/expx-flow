import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWhatsAppConversationNotes } from "@/hooks/useWhatsAppConversationNotes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNote, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppChatNotesProps {
  conversationId: string;
  chatName: string;
  className?: string;
}

export function WhatsAppChatNotes({
  conversationId,
  chatName,
  className,
}: WhatsAppChatNotesProps) {
  const { notes, profilesByUserId, isLoading, deleteNote } = useWhatsAppConversationNotes(conversationId);

  const handleDelete = (noteId: string) => {
    deleteNote.mutate(noteId);
  };

  if (isLoading) {
    return null; // Don't show loading state in header
  }

  if (notes.length === 0) {
    return null; // Don't show anything if no notes
  }

  return (
    <div className={cn("border-b bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50", className)}>
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Observações sobre este chat ({chatName})
          </span>
        </div>
        <ScrollArea className={notes.length > 2 ? "max-h-32" : undefined}>
          <div className="space-y-2">
            {notes.map((note) => {
              const authorName = profilesByUserId[note.userId] || "Usuário";
              return (
                <div
                  key={note.id}
                  className="group flex items-start gap-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {authorName}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(note.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleteNote.isPending}
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
