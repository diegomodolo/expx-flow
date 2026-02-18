import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Hash, Users, Plus, Paperclip, MessageSquarePlus, BarChart3, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { EmojiGifPicker } from './EmojiGifPicker';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import type { InternalChannel, InternalMessage } from '@/hooks/useInternalChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatFlowProps {
  channel: InternalChannel | null;
  messages: InternalMessage[];
  loading?: boolean;
  onSendMessage: (content: string, threadParentId?: string) => void;
  sendingMessage?: boolean;
}

export function ChatFlow({ channel, messages, loading, onSendMessage, sendingMessage }: ChatFlowProps) {
  const [inputValue, setInputValue] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<InternalMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sendingMessage) return;
    onSendMessage(trimmed, replyingTo?.id);
    setInputValue('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleReplyInThread = useCallback((message: InternalMessage) => {
    setReplyingTo(message);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleConvertToTask = useCallback(async (message: InternalMessage) => {
    if (!user?.id || !activeCompany?.company_id) {
      toast.error('Erro ao criar tarefa');
      return;
    }

    try {
      const title = message.content.length > 80
        ? message.content.slice(0, 77) + '...'
        : message.content;

      const { error } = await (supabase.from('tasks') as any).insert({
        title,
        description: `Criado a partir de mensagem no canal de chat.\n\nMensagem original de ${message.user_name}:\n"${message.content}"`,
        company_id: activeCompany.company_id,
        user_id: user.id,
        status: 'todo',
        task_state: 'backlog',
        origin: 'chat',
      });

      if (error) throw error;

      toast.success('✅ Tarefa criada com sucesso!', {
        description: title,
      });
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error('Erro ao criar tarefa');
    }
  }, [user?.id, activeCompany?.company_id]);

  // Group messages: parent messages with their replies nested
  const groupedMessages = useMemo(() => {
    const parents: InternalMessage[] = [];
    const repliesByParent = new Map<string, InternalMessage[]>();

    for (const msg of messages) {
      if (msg.thread_parent_id) {
        const existing = repliesByParent.get(msg.thread_parent_id) || [];
        existing.push(msg);
        repliesByParent.set(msg.thread_parent_id, existing);
      } else {
        parents.push(msg);
      }
    }

    return parents.map(p => ({
      parent: p,
      replies: repliesByParent.get(p.id) || [],
    }));
  }, [messages]);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="text-center text-muted-foreground">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-body-md">Selecione um canal para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-sm min-w-0">
      {/* Channel Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <Hash className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-title-md text-foreground">{channel.name}</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="space-y-4 px-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-body-md text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-body-sm text-muted-foreground/70 mt-1">
              Seja o primeiro a enviar uma mensagem neste canal!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {groupedMessages.map(({ parent, replies }) => (
              <div key={parent.id}>
                <MessageBubble
                  message={parent}
                  isOwnMessage={parent.user_id === user?.id}
                  onReplyInThread={handleReplyInThread}
                  onConvertToTask={handleConvertToTask}
                />
                {/* Inline thread replies */}
                {replies.length > 0 && (
                  <div className="ml-11 border-l-2 border-primary/20 pl-3 space-y-0.5">
                    {replies.map((reply) => (
                      <MessageBubble
                        key={reply.id}
                        message={reply}
                        isOwnMessage={reply.user_id === user?.id}
                        onReplyInThread={() => handleReplyInThread(parent)}
                        onConvertToTask={handleConvertToTask}
                        isThreadReply
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-border shrink-0">
        {/* Reply indicator bar (Discord-style) */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border">
            <span className="text-xs text-muted-foreground">
              Respondendo para{' '}
              <span className="font-semibold text-primary">{replyingTo.user_name}</span>
            </span>
            <span className="text-xs text-muted-foreground/60 truncate flex-1 max-w-[300px]">
              — {replyingTo.content}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2 p-4">
          <Popover open={plusOpen} onOpenChange={setPlusOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-xl shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-52 p-1.5">
              <button
                onClick={() => { setPlusOpen(false); toast.info('Funcionalidade de envio de arquivo em breve!'); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                Enviar um arquivo
              </button>
              <button
                onClick={() => { setPlusOpen(false); toast.info('Funcionalidade de tópicos em breve!'); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
                Criar um tópico
              </button>
              <button
                onClick={() => { setPlusOpen(false); toast.info('Funcionalidade de enquetes em breve!'); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Criar uma enquete
              </button>
            </PopoverContent>
          </Popover>

          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? `Responder para ${replyingTo.user_name}...` : `Mensagem em #${channel.name}...`}
            className="min-h-[40px] max-h-[120px] resize-none rounded-xl bg-muted/50 border-border focus-visible:ring-primary"
            rows={1}
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <EmojiGifPicker
              onEmojiSelect={(emoji) => setInputValue(prev => prev + emoji)}
              onGifSelect={() => {}}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || sendingMessage}
              className="rounded-xl h-10 w-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
