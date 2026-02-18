import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, CheckSquare, Trash2, Download, FileIcon, MessageSquarePlus, Pin } from 'lucide-react';
import type { InternalMessage } from '@/hooks/useInternalChat';
import { TaskMiniCard } from './TaskMiniCard';
import { PollCard } from './PollCard';

interface MessageBubbleProps {
  message: InternalMessage;
  isOwnMessage?: boolean;
  isThreadReply?: boolean;
  onReplyInThread?: (message: InternalMessage) => void;
  onConvertToTask?: (message: InternalMessage) => void;
  onDeleteMessage?: (message: InternalMessage) => void;
  onTogglePin?: (message: InternalMessage) => void;
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Split by task references first, then apply markdown within text parts
  const taskParts = text.split(/(#[a-f0-9-]{36})/gi);
  
  return taskParts.map((part, i) => {
    const taskMatch = part.match(/^#([a-f0-9-]{36})$/i);
    if (taskMatch) {
      return <TaskMiniCard key={i} taskId={taskMatch[1]} />;
    }
    
    // Apply basic markdown: **bold**, *italic*, `code`, [link](url)
    const elements: React.ReactNode[] = [];
    // Process inline markdown
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<span key={`${i}-t-${keyIdx++}`}>{part.slice(lastIndex, match.index)}</span>);
      }

      if (match[2]) {
        // **bold**
        elements.push(<strong key={`${i}-b-${keyIdx++}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        elements.push(<em key={`${i}-i-${keyIdx++}`}>{match[3]}</em>);
      } else if (match[4]) {
        // `code`
        elements.push(
          <code key={`${i}-c-${keyIdx++}`} className="px-1 py-0.5 rounded bg-muted text-xs font-mono text-foreground">
            {match[4]}
          </code>
        );
      } else if (match[5] && match[6]) {
        // [link](url)
        elements.push(
          <a key={`${i}-l-${keyIdx++}`} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {match[5]}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < part.length) {
      elements.push(<span key={`${i}-e-${keyIdx}`}>{part.slice(lastIndex)}</span>);
    }

    return elements.length > 0 ? <span key={i}>{elements}</span> : <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message, isOwnMessage, isThreadReply, onReplyInThread, onConvertToTask, onDeleteMessage, onTogglePin }: MessageBubbleProps) {
  const initials = (message.user_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isImage = message.file_type?.startsWith('image/');
  const isVideo = message.file_type?.startsWith('video/');
  const isAudio = message.file_type?.startsWith('audio/');

  const renderFileAttachment = () => {
    if (!message.file_url) return null;

    if (isImage) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 max-w-xs">
          <img src={message.file_url} alt={message.file_name || 'Imagem'} className="rounded-lg max-h-60 object-cover border border-border" loading="lazy" />
        </a>
      );
    }
    if (isVideo) {
      return <video src={message.file_url} controls className="rounded-lg max-h-60 mt-1.5 max-w-xs border border-border" />;
    }
    if (isAudio) {
      return <audio src={message.file_url} controls className="mt-1.5 max-w-xs" />;
    }
    return (
      <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors max-w-xs">
        <FileIcon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">{message.file_name || 'Arquivo'}</span>
        <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </a>
    );
  };

  const replyCount = message.reply_count || 0;
  const isTopic = !!message.topic_title;

  return (
    <div className={`group relative flex items-start gap-3 px-4 py-1.5 hover:bg-muted/30 transition-colors ${isThreadReply ? 'px-2 py-1' : ''} ${message.is_pinned ? 'bg-warning/5 border-l-2 border-warning' : ''}`}>
      <Avatar className={`${isThreadReply ? 'w-6 h-6' : 'w-8 h-8'} mt-0.5 shrink-0`}>
        <AvatarImage src={message.user_avatar} />
        <AvatarFallback className={`${isThreadReply ? 'text-[10px]' : 'text-xs'} bg-primary/10 text-primary`}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{message.user_name}</span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(message.created_at), "HH:mm", { locale: ptBR })}
          </span>
          {message.is_pinned && (
            <span className="text-[10px] text-warning flex items-center gap-0.5">
              <Pin className="w-2.5 h-2.5" /> fixada
            </span>
          )}
        </div>

        {isTopic && (
          <div className="flex items-center gap-2 mt-1 mb-1">
            <MessageSquarePlus className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">{message.topic_title}</span>
          </div>
        )}

        {message.content.startsWith('📊') ? null : (
          <div className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
            {renderMarkdown(message.content)}
          </div>
        )}
        {renderFileAttachment()}

        {message.content.startsWith('📊') && <PollCard messageId={message.id} />}

        {!isThreadReply && replyCount > 0 && (
          <button onClick={() => onReplyInThread?.(message)} className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline">
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
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onReplyInThread?.(message)}>
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Responder na thread</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onTogglePin?.(message)}>
                <Pin className={`w-3.5 h-3.5 ${message.is_pinned ? 'text-warning' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{message.is_pinned ? 'Desafixar' : 'Fixar mensagem'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onConvertToTask?.(message)}>
                <CheckSquare className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Converter em tarefa</TooltipContent>
          </Tooltip>

          {isOwnMessage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteMessage?.(message)}>
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
