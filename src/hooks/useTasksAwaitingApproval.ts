import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TaskAwaitingApproval {
  id: string;
  notification_id: string;
  title: string;
  body: string | null;
  task_id: string | null;
  created_at: string;
  is_read: boolean;
}

export function useTasksAwaitingApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-awaiting-approval", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_notifications" as unknown)
        .select("id, title, body, action_metadata, created_at, is_read")
        .eq("user_id", user.id)
        .eq("type", "task_review")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((n: { id: string; title: string; body: string | null; action_metadata: Record<string, unknown> | null; created_at: string; is_read: boolean }) => ({
        id: n.id,
        notification_id: n.id,
        title: n.title,
        body: n.body,
        task_id: n.action_metadata?.task_id as string | null,
        created_at: n.created_at,
        is_read: n.is_read,
      })) as TaskAwaitingApproval[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("user_notifications" as unknown)
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-awaiting-approval", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications", user?.id] });
    },
  });

  return { tasks, count: tasks.length, isLoading, markAsRead };
}
