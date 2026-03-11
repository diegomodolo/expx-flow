import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InternalMessage } from '@/hooks/useInternalChat';

interface ThreadPanelProps {
  parentMessage: InternalMessage;
  onClose: () => void;
}

export function ThreadPanel({ parentMessage, onClose }: ThreadPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch thread replies
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['thread-replies', parentMessage.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('thread_parent_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map(msg => ({
        ...msg,
        user_name: profileMap.get(msg.user_id)?.full_name || 'Usuário',
        user_avatar: profileMap.get(msg.user_id)?.avatar_url || undefined,
      })) as InternalMessage[];
    },
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  // Realtime subscription for thread
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'internal_messages',
        filter: `thread_parent_id=eq.${parentMessage.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['thread-replies', parentMessage.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessage.id, queryClient]);

  // Send reply
  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('internal_messages')
        .insert({
          channel_id: parentMessage.channel_id,
          user_id: user.id,
          content,
          thread_parent_id: parentMessage.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-replies', parentMessage.id] });
      queryClient.invalidateQueries({ queryKey: ['internal-messages'] });
    },
  });

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sendReply.isPending) return;
    sendReply.mutate(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const parentInitials = (parentMessage.user_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-80 border-l border-border bg-card/80 backdrop-blur-sm flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Thread</h3>
        </div>
        <Button aria-label="Fechar" size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-start gap-2">
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarImage src={parentMessage.user_avatar} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{parentInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-foreground">{parentMessage.user_name}</span>
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(parentMessage.created_at), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
            <p className="text-xs text-foreground/80 break-words line-clamp-3">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
        ) : replies.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma resposta ainda</p>
        ) : (
          <div className="space-y-2 px-3">
            {replies.map(reply => {
              const ri = (reply.user_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={reply.id} className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarImage src={reply.user_avatar} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{ri}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-foreground">{reply.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(reply.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 break-words whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-end gap-1.5">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Responder na thread..."
            className="min-h-[36px] max-h-[80px] resize-none rounded-lg bg-muted/50 border-border text-xs"
            rows={1}
          />
          <Button aria-label="Enviar"
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || sendReply.isPending}
            className="rounded-lg h-9 w-9 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
