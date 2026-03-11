import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, MessageSquare, AlertTriangle, Sparkles, ClipboardList, Megaphone, User, Zap } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserNotifications, UserNotification } from "@/hooks/useUserNotifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Icon map per notification type
const typeIconMap: Record<string, React.ElementType> = {
  lead_disqualified: AlertTriangle,
  ad_pending_approval: Megaphone,
  task_review: ClipboardList,
  task_assigned: User,
  message_mention: MessageSquare,
  message_channel: MessageSquare,
  creative_pending: Sparkles,
  client_alert: AlertTriangle,
  campaign_alert: Zap,
  system: Bell,
};

const typeColorMap: Record<string, string> = {
  lead_disqualified: "text-destructive",
  ad_pending_approval: "text-warning",
  task_review: "text-primary",
  task_assigned: "text-primary",
  message_mention: "text-primary",
  message_channel: "text-muted-foreground",
  creative_pending: "text-warning",
  client_alert: "text-destructive",
  campaign_alert: "text-warning",
  system: "text-muted-foreground",
};

function getTypeIcon(type: string): React.ElementType {
  return typeIconMap[type] || Bell;
}

function getTypeColor(type: string): string {
  return typeColorMap[type] || "text-muted-foreground";
}

interface NotificationItemProps {
  notification: UserNotification;
  onRead: (id: string, actionUrl?: string | null) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const Icon = getTypeIcon(notification.type);
  const iconColor = getTypeColor(notification.type);

  return (
    <button
      onClick={() => onRead(notification.id, notification.action_url)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className={cn("mt-0.5 shrink-0 p-1.5 rounded-full bg-muted", iconColor)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm line-clamp-1", !notification.is_read && "font-semibold text-foreground")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        )}
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </button>
  );
}

interface ChatNotificationItemProps {
  notification: unknown;
  onRead: (id: string) => void;
}

function ChatNotificationItem({ notification, onRead }: ChatNotificationItemProps) {
  return (
    <button
      onClick={() => onRead(notification.id)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors bg-primary/5"
    >
      <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-muted text-primary">
        <MessageSquare className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-1 font-semibold text-foreground">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        )}
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
    </button>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    notifications,
    chatNotifications,
    totalUnreadCount,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useUserNotifications();

  const markChatRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("internal_notifications" as unknown)
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] });
    },
  });

  const markAllChatRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("internal_notifications" as unknown)
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] });
    },
  });

  const handleReadNotification = (id: string, actionUrl?: string | null) => {
    markAsRead.mutate(id);
    if (actionUrl) {
      navigate(actionUrl);
      setOpen(false);
    }
  };

  const handleReadChatNotification = (id: string) => {
    markChatRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) markAllAsRead.mutate();
    if (chatNotifications.length > 0) markAllChatRead.mutate();
  };

  // Merge and sort all notifications by date
  const allItems = [
    ...notifications.map((n) => ({ ...n, _source: "user" as const })),
    ...chatNotifications.map((n) => ({ ...n, _source: "chat" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10 rounded-full hover:bg-muted/60"
          title="Notificações"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalUnreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-destructive hover:bg-destructive pointer-events-none">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
            {totalUnreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{totalUnreadCount} não lida{totalUnreadCount !== 1 ? "s" : ""}</p>
            )}
          </div>
          {totalUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3 h-3" /> Marcar todas
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Bell className="w-10 h-10 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allItems.map((item) =>
                item._source === "user" ? (
                  <NotificationItem
                    key={`user-${item.id}`}
                    notification={item as UserNotification}
                    onRead={handleReadNotification}
                  />
                ) : (
                  <ChatNotificationItem
                    key={`chat-${item.id}`}
                    notification={item}
                    onRead={handleReadChatNotification}
                  />
                )
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {allItems.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
              onClick={() => {
                navigate("/notificacoes");
                setOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
