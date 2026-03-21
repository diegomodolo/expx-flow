import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface ReviewTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  responsible_name: string;
  responsible_avatar: string | null;
  assigned_user_id: string | null;
  deadline: string;
  due_date: string | null;
  created_at: string;
  team_id: string | null;
  related_client_id: string | null;
  progress: number;
  task_type: string;
  autorizador_id: string | null;
  team: { name: string; color: string } | null;
  client: { name: string } | null;
}

export function useTasksAwaitingReview() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ["tasks-awaiting-review", activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id, title, description, status, priority,
          responsible_name, responsible_avatar, assigned_user_id,
          deadline, due_date, created_at, team_id, related_client_id,
          progress, task_type, autorizador_id,
          team:teams(name, color),
          client:clients!related_client_id(name)
        `,
        )
        .eq("company_id", activeCompany.company_id)
        .in("status", ["review", "waiting_approval"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ReviewTask[];
    },
    enabled: !!user && !!activeCompany?.company_id,
    refetchInterval: 30000,
  });
}
