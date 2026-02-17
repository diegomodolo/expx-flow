import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InternalMessage } from '@/hooks/useInternalChat';
import { TaskMiniCard } from './TaskMiniCard';

interface MessageBubbleProps {
  message: InternalMessage;
  isOwnMessage?: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const initials = (message.user_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Parse task references from content (#uuid pattern)
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

  return (
    <div className="group flex items-start gap-3 px-4 py-1.5 hover:bg-muted/30 transition-colors">
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
      </div>
    </div>
  );
}
