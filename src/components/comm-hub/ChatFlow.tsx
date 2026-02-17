import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Hash, Users, Plus, Paperclip, MessageSquarePlus, BarChart3 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { InternalChannel, InternalMessage } from '@/hooks/useInternalChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatFlowProps {
  channel: InternalChannel | null;
  messages: InternalMessage[];
  loading?: boolean;
  onSendMessage: (content: string) => void;
  sendingMessage?: boolean;
}

export function ChatFlow({ channel, messages, loading, onSendMessage, sendingMessage }: ChatFlowProps) {
  const [inputValue, setInputValue] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sendingMessage) return;
    onSendMessage(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-body-md text-muted-foreground">
              Nenhuma mensagem ainda
            </p>
            <p className="text-body-sm text-muted-foreground/70 mt-1">
              Seja o primeiro a enviar uma mensagem neste canal!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.user_id === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-end gap-2">
          {/* Plus menu */}
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
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem em #${channel.name}...`}
            className="min-h-[40px] max-h-[120px] resize-none rounded-xl bg-muted/50 border-border focus-visible:ring-primary"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || sendingMessage}
            className="rounded-xl shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
