import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, MessageSquare, ClipboardList, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  priority: string;
  is_read: boolean;
  ai_score: number | null;
  ai_reason: string | null;
  channel_id: string | null;
  task_id: string | null;
  created_at: string;
}

const priorityIcons: Record<string, typeof MessageSquare> = {
  urgent: AlertTriangle,
  high: Sparkles,
  normal: MessageSquare,
  low: MessageSquare,
};

const priorityColors: Record<string, string> = {
  urgent: 'text-destructive',
  high: 'text-warning',
  normal: 'text-primary',
  low: 'text-muted-foreground',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['internal-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('internal_notifications' as unknown)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('internal_notifications' as unknown)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notifications', user?.id] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_notifications' as unknown)
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notifications', user?.id] });
    },
  });

  const getTypeIcon = (n: Notification) => {
    if (n.type === 'task') return ClipboardList;
    return priorityIcons[n.priority] || MessageSquare;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full px-1 text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" /> Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = getTypeIcon(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.is_read) markOneRead.mutate(n.id); }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors',
                      !n.is_read && 'bg-primary/5'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', priorityColors[n.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm line-clamp-1', !n.is_read && 'font-medium text-foreground')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {n.ai_reason && (
                          <span className="text-[10px] text-primary flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> IA
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
