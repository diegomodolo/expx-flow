import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ActivityLogFilters {
  userId?: string;
  eventType?: string;
  module?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  module: string | null;
  action_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

export function useUserActivityLogs(filters: ActivityLogFilters = {}) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const limit = filters.limit ?? 100;

  return useQuery({
    queryKey: ["user-activity-logs", companyId, filters],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
       
      let query = (supabase as any)
        .from("user_activity_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.userId) query = query.eq("user_id", filters.userId);
      if (filters.eventType) query = query.eq("event_type", filters.eventType);
      if (filters.module) query = query.eq("module", filters.module);
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ActivityLogEntry[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}
