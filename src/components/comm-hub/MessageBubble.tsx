import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, CheckSquare, MoreHorizontal } from 'lucide-react';
import type { InternalMessage } from '@/hooks/useInternalChat';
import { TaskMiniCard } from './TaskMiniCard';

interface MessageBubbleProps {
  message: InternalMessage;
  isOwnMessage?: boolean;
  onReplyInThread?: (message: InternalMessage) => void;
  onConvertToTask?: (message: InternalMessage) => void;
}

export function MessageBubble({ message, isOwnMessage, onReplyInThread, onConvertToTask }: MessageBubbleProps) {
  const initials = (message.user_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderContent = (content: string) => {
    const parts = content.split(/(#[a-f0-9-]{36})/gi);
    return parts.map((part, i) => {
      const match = part.match(/^#([a-f0-9-]{36})$/i);
      if (match) {
        return <TaskMiniCard key={i} taskId={match[1]} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const replyCount = (message as any).reply_count || 0;

  return (
    <div className="group relative flex items-start gap-3 px-4 py-1.5 hover:bg-muted/30 transition-colors">
      <Avatar className="w-8 h-8 mt-0.5 shrink-0">
        <AvatarImage src={message.user_avatar} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {message.user_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(message.created_at), "HH:mm", { locale: ptBR })}
          </span>
        </div>
        <div className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>

        {/* Thread indicator */}
        {replyCount > 0 && (
          <button
            onClick={() => onReplyInThread?.(message)}
            className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="w-3 h-3" />
            {replyCount} {replyCount === 1 ? 'resposta' : 'respostas'}
          </button>
        )}
      </div>

      {/* Hover action buttons */}
      <TooltipProvider delayDuration={200}>
        <div className="absolute right-2 top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onReplyInThread?.(message)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Responder na thread</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onConvertToTask?.(message)}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Converter em tarefa</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
