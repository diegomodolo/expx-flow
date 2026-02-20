import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useUserNotifications, UserNotification } from "@/hooks/useUserNotifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, MessageSquare, AlertTriangle, Sparkles, ClipboardList, Megaphone, User, Zap, Filter } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  lead_disqualified: "text-destructive bg-destructive/10",
  ad_pending_approval: "text-warning bg-warning/10",
  task_review: "text-primary bg-primary/10",
  task_assigned: "text-primary bg-primary/10",
  message_mention: "text-primary bg-primary/10",
  message_channel: "text-muted-foreground bg-muted",
  creative_pending: "text-warning bg-warning/10",
  client_alert: "text-destructive bg-destructive/10",
  campaign_alert: "text-warning bg-warning/10",
  system: "text-muted-foreground bg-muted",
};

const typeLabelMap: Record<string, string> = {
  lead_disqualified: "Lead",
  ad_pending_approval: "Anúncio",
  task_review: "Tarefa",
  task_assigned: "Tarefa",
  message_mention: "Mensagem",
  message_channel: "Canal",
  creative_pending: "Criativo",
  client_alert: "Cliente",
  campaign_alert: "Campanha",
  system: "Sistema",
};

function NotificationRow({ notification, onRead }: { notification: UserNotification; onRead: (id: string, url?: string | null) => void }) {
  const Icon = typeIconMap[notification.type] || Bell;
  const colorClass = typeColorMap[notification.type] || "text-muted-foreground bg-muted";
  const label = typeLabelMap[notification.type] || "Sistema";

  return (
    <button
      onClick={() => onRead(notification.id, notification.action_url)}
      className={cn(
        "w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-accent/40 transition-colors border-b border-border last:border-0",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className={cn("mt-0.5 shrink-0 p-2 rounded-full", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn("text-sm", !notification.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>
            {notification.title}
          </p>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">{label}</Badge>
          {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 ml-auto" />}
        </div>
        {notification.body && (
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
        )}
        <span className="text-xs text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </button>
  );
}

function ChatRow({ notification, onRead }: { notification: any; onRead: (id: string) => void }) {
  return (
    <button
      onClick={() => onRead(notification.id)}
      className="w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-accent/40 transition-colors border-b border-border last:border-0 bg-primary/5"
    >
      <div className="mt-0.5 shrink-0 p-2 rounded-full text-primary bg-primary/10">
        <MessageSquare className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">Chat</Badge>
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 ml-auto" />
        </div>
        {notification.body && (
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
        )}
        <span className="text-xs text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </button>
  );
}

export default function Notificacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notifications, chatNotifications, totalUnreadCount, unreadCount, markAsRead, markAllAsRead } = useUserNotifications();

  const markChatRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("internal_notifications" as any).update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] }),
  });

  const markAllChatRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase.from("internal_notifications" as any).update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] }),
  });

  const handleRead = (id: string, url?: string | null) => {
    markAsRead.mutate(id);
    if (url) navigate(url);
  };

  const handleMarkAll = () => {
    if (unreadCount > 0) markAllAsRead.mutate();
    if (chatNotifications.length > 0) markAllChatRead.mutate();
  };

  const allItems = [
    ...notifications.map((n) => ({ ...n, _source: "user" as const })),
    ...chatNotifications.map((n) => ({ ...n, _source: "chat" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadItems = allItems.filter((n) => !n.is_read);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
            {totalUnreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">{totalUnreadCount} não lida{totalUnreadCount !== 1 ? "s" : ""}</p>
            )}
          </div>
          {totalUnreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAll}>
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Tabs defaultValue="all">
            <div className="border-b border-border px-4">
              <TabsList className="bg-transparent h-12 gap-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-muted rounded-lg">
                  Todas
                  {allItems.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs">{allItems.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="data-[state=active]:bg-muted rounded-lg">
                  Não lidas
                  {unreadItems.length > 0 && (
                    <Badge className="ml-1.5 text-xs bg-destructive hover:bg-destructive">{unreadItems.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              {allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Bell className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div>
                  {allItems.map((item) =>
                    item._source === "user" ? (
                      <NotificationRow key={`u-${item.id}`} notification={item as UserNotification} onRead={handleRead} />
                    ) : (
                      <ChatRow key={`c-${item.id}`} notification={item} onRead={(id) => markChatRead.mutate(id)} />
                    )
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="mt-0">
              {unreadItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <CheckCheck className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Nenhuma notificação não lida</p>
                </div>
              ) : (
                <div>
                  {unreadItems.map((item) =>
                    item._source === "user" ? (
                      <NotificationRow key={`u-${item.id}`} notification={item as UserNotification} onRead={handleRead} />
                    ) : (
                      <ChatRow key={`c-${item.id}`} notification={item} onRead={(id) => markChatRead.mutate(id)} />
                    )
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
