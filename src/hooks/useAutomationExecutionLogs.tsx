import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface AutomationExecutionLog {
  id: string;
  company_id: string;
  client_id: string | null;
  execution_id: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  actions_taken: number;
  total_rules_evaluated: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  execution_details: any;
  created_at: string;
  clients?: {
    name: string;
  };
}

export const useAutomationExecutionLogs = (clientId?: string | null, limit: number = 50) => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['automation-execution-logs', activeCompany?.company_id, clientId, limit],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      try {
        const query = supabase
          .from('automation_execution_logs' as any)
          .select(`
            *,
            clients:client_id (
              name
            )
          `)
          .eq('company_id', activeCompany.company_id)
          .order('started_at', { ascending: false })
          .limit(limit);

        if (clientId) {
          query.eq('client_id', clientId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching execution logs:', error);
          return [];
        }

        return (data || []) as unknown as AutomationExecutionLog[];
      } catch (error) {
        console.error('Error in execution logs query:', error);
        return [];
      }
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Get latest execution status
  const latestExecution = logs?.[0];
  const isRunning = latestExecution?.status === 'running';

  // Calculate statistics
  const stats = {
    total: logs?.length || 0,
    completed: logs?.filter(l => l.status === 'completed').length || 0,
    failed: logs?.filter(l => l.status === 'failed').length || 0,
    partial: logs?.filter(l => l.status === 'partial').length || 0,
    avgDuration: logs?.length 
      ? Math.round(logs.reduce((acc, l) => acc + (l.duration_ms || 0), 0) / logs.length)
      : 0,
    totalActions: logs?.reduce((acc, l) => acc + l.actions_taken, 0) || 0,
  };

  return {
    logs: logs || [],
    loading: isLoading,
    latestExecution,
    isRunning,
    stats,
    refetch,
  };
};
