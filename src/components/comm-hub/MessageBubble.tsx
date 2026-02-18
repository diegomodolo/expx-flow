import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, CheckSquare, Trash2, Download, FileIcon, MessageSquarePlus } from 'lucide-react';
import type { InternalMessage } from '@/hooks/useInternalChat';
import { TaskMiniCard } from './TaskMiniCard';

interface MessageBubbleProps {
  message: InternalMessage;
  isOwnMessage?: boolean;
  isThreadReply?: boolean;
  onReplyInThread?: (message: InternalMessage) => void;
  onConvertToTask?: (message: InternalMessage) => void;
  onDeleteMessage?: (message: InternalMessage) => void;
}

export function MessageBubble({ message, isOwnMessage, isThreadReply, onReplyInThread, onConvertToTask, onDeleteMessage }: MessageBubbleProps) {
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

  const isImage = message.file_type?.startsWith('image/');
  const isVideo = message.file_type?.startsWith('video/');
  const isAudio = message.file_type?.startsWith('audio/');

  const renderFileAttachment = () => {
    if (!message.file_url) return null;

    if (isImage) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 max-w-xs">
          <img
            src={message.file_url}
            alt={message.file_name || 'Imagem'}
            className="rounded-lg max-h-60 object-cover border border-border"
            loading="lazy"
          />
        </a>
      );
    }

    if (isVideo) {
      return (
        <video
          src={message.file_url}
          controls
          className="rounded-lg max-h-60 mt-1.5 max-w-xs border border-border"
        />
      );
    }

    if (isAudio) {
      return (
        <audio src={message.file_url} controls className="mt-1.5 max-w-xs" />
      );
    }

    return (
      <a
        href={message.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors max-w-xs"
      >
        <FileIcon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">{message.file_name || 'Arquivo'}</span>
        <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </a>
    );
  };

  const replyCount = message.reply_count || 0;

  const isTopic = !!message.topic_title;

  return (
    <div className={`group relative flex items-start gap-3 px-4 py-1.5 hover:bg-muted/30 transition-colors ${isThreadReply ? 'px-2 py-1' : ''}`}>
      <Avatar className={`${isThreadReply ? 'w-6 h-6' : 'w-8 h-8'} mt-0.5 shrink-0`}>
        <AvatarImage src={message.user_avatar} />
        <AvatarFallback className={`${isThreadReply ? 'text-[10px]' : 'text-xs'} bg-primary/10 text-primary`}>
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

        {/* Topic header */}
        {isTopic && (
          <div className="flex items-center gap-2 mt-1 mb-1">
            <MessageSquarePlus className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">{message.topic_title}</span>
          </div>
        )}

        <div className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>
        {renderFileAttachment()}

        {/* Thread indicator - only show on parent messages, not on inline replies */}
        {!isThreadReply && replyCount > 0 && (
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

          {isOwnMessage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDeleteMessage?.(message)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Apagar mensagem</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
