import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";

export interface UserNotification {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  priority: string;
  action_url: string | null;
  action_metadata: Record<string, unknown> | null;
  source_type: string;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useUserNotifications() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<UserNotification[]>({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as UserNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-notifications", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications" as any)
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications", user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("user_notifications" as any)
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications", user?.id] });
    },
  });

  // Also aggregate internal_notifications (chat) for the unified bell
  const { data: chatNotifications = [] } = useQuery<any[]>({
    queryKey: ["internal-notifications-unified", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("internal_notifications" as any)
        .select("id, type, title, body, priority, is_read, channel_id, task_id, created_at")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const chatUnreadCount = chatNotifications.length;

  const totalUnreadCount = unreadCount + chatUnreadCount;

  return {
    notifications,
    chatNotifications,
    isLoading,
    unreadCount,
    chatUnreadCount,
    totalUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}
