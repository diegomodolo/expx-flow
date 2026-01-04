import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

export interface ActivityItem {
  id: string;
  company_id: string;
  user_id: string | null;
  activity_type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  description: string | null;
  metadata: {
    image_url?: string;
    client_name?: string;
    client_id?: string;
    campaign_name?: string;
    old_value?: string | number;
    new_value?: string | number;
    [key: string]: any;
  };
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export function useActivityFeed(limit = 20) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading, error, refetch } = useQuery({
    queryKey: ["activity-feed", activeCompany?.company_id, limit],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      // First, get activities from activity_feed table
      const { data: feedActivities, error: feedError } = await supabase
        .from("activity_feed")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (feedError) throw feedError;

      // Also get recent activities from other tables to populate the feed
      const recentActivities: ActivityItem[] = [];

      // Get recent generated creatives
      const { data: creatives } = await supabase
        .from("creative_generation_queue")
        .select("id, generated_at, generated_content, status, client_id")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "approved")
        .order("generated_at", { ascending: false })
        .limit(5);

      if (creatives) {
        for (const creative of creatives) {
          const { data: client } = await supabase
            .from("clients")
            .select("name")
            .eq("id", creative.client_id)
            .single();

          const content = creative.generated_content as any;
          recentActivities.push({
            id: `creative-${creative.id}`,
            company_id: activeCompany.company_id,
            user_id: null,
            activity_type: "creative_generated",
            entity_type: "creative",
            entity_id: creative.id,
            title: "Criativo gerado",
            description: content?.headline || "Novo criativo aprovado",
            metadata: {
              image_url: content?.image_url,
              client_name: client?.name || "Cliente",
              client_id: creative.client_id,
            },
            created_at: creative.generated_at,
          });
        }
      }

      // Get recent carousels
      const { data: carousels } = await supabase
        .from("carousel_generation_queue")
        .select("id, generated_at, theme, status, client_id, slides")
        .eq("company_id", activeCompany.company_id)
        .in("status", ["approved", "pending"])
        .order("generated_at", { ascending: false })
        .limit(5);

      if (carousels) {
        for (const carousel of carousels) {
          const { data: client } = await supabase
            .from("clients")
            .select("name")
            .eq("id", carousel.client_id)
            .single();

          const slides = carousel.slides as any[];
          const firstSlide = slides?.[0];
          recentActivities.push({
            id: `carousel-${carousel.id}`,
            company_id: activeCompany.company_id,
            user_id: null,
            activity_type: "carousel_generated",
            entity_type: "carousel",
            entity_id: carousel.id,
            title: "Carrossel gerado",
            description: carousel.theme || `${slides?.length || 0} slides`,
            metadata: {
              image_url: firstSlide?.image_url,
              client_name: client?.name || "Cliente",
              client_id: carousel.client_id,
            },
            created_at: carousel.generated_at,
          });
        }
      }

      // Get recent completed tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, completed_at, related_client_id, assigned_user_id")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "done")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      if (tasks) {
        for (const task of tasks) {
          let clientName: string | undefined;
          let assigneeName: string | undefined;
          
          if (task.related_client_id) {
            const { data: client } = await supabase
              .from("clients")
              .select("name")
              .eq("id", task.related_client_id)
              .single();
            clientName = client?.name;
          }

          if (task.assigned_user_id) {
            const { data: employee } = await supabase
              .from("employees")
              .select("name")
              .eq("user_id", task.assigned_user_id)
              .single();
            assigneeName = employee?.name;
          }

          recentActivities.push({
            id: `task-${task.id}`,
            company_id: activeCompany.company_id,
            user_id: null,
            activity_type: "task_completed",
            entity_type: "task",
            entity_id: task.id,
            title: "Tarefa concluída",
            description: task.title,
            metadata: {
              client_name: clientName,
              client_id: task.related_client_id || undefined,
              assignee_name: assigneeName,
            },
            created_at: task.completed_at!,
            user_name: assigneeName,
          });
        }
      }

      // Combine and sort all activities
      const allActivities = [...(feedActivities || []), ...recentActivities];
      allActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Remove duplicates based on entity_id and entity_type
      const seen = new Set<string>();
      const uniqueActivities = allActivities.filter(activity => {
        const key = `${activity.entity_type}-${activity.entity_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return uniqueActivities.slice(0, limit) as ActivityItem[];
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: 60000, // Refresh every minute
  });

  const logActivity = useMutation({
    mutationFn: async (activity: {
      activity_type: string;
      entity_type: string;
      entity_id?: string;
      title: string;
      description?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!activeCompany?.company_id) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("activity_feed")
        .insert({
          company_id: activeCompany.company_id,
          user_id: user?.id,
          ...activity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });

  return {
    activities,
    isLoading,
    error,
    refetch,
    logActivity: logActivity.mutate,
  };
}
