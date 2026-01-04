import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Pin, Send, Trash2 } from 'lucide-react';
import { useTeamNotes } from '@/hooks/useTeamNotes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TeamNotesCard = () => {
  const [newNote, setNewNote] = useState('');
  const { notes, isLoading, addNote, togglePin, deleteNote, currentUserId } = useTeamNotes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      addNote.mutate(newNote.trim());
      setNewNote('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notas da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notas da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Adicionar nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newNote.trim() || addNote.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {notes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma nota ainda</p>
            <p className="text-xs">Seja o primeiro a adicionar!</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-3 pr-3">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={`
                    p-3 rounded-lg border transition-colors
                    ${note.is_pinned 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border/50 hover:border-border'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={note.author_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {note.author_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {note.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                        {note.is_pinned && (
                          <Pin className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {note.content}
                      </p>
                    </div>

                    {note.user_id === currentUserId && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => togglePin.mutate({ 
                            noteId: note.id, 
                            isPinned: note.is_pinned 
                          })}
                        >
                          <Pin className={`h-3 w-3 ${note.is_pinned ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteNote.mutate(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
