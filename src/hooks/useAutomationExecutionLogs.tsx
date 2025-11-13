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

export type PeriodFilter = 'hour' | 'day' | 'week' | 'all';

export const useAutomationExecutionLogs = (
  clientId?: string | null, 
  limit: number = 50,
  periodFilter: PeriodFilter = 'all'
) => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['automation-execution-logs', activeCompany?.company_id, clientId, limit, periodFilter],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      try {
        console.log('Fetching execution logs for company:', activeCompany.company_id, 'client:', clientId, 'period:', periodFilter);
        
        // Calculate date filter based on period
        let dateFilter: string | null = null;
        const now = new Date();
        
        switch (periodFilter) {
          case 'hour':
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            dateFilter = oneHourAgo.toISOString();
            break;
          case 'day':
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            dateFilter = oneDayAgo.toISOString();
            break;
          case 'week':
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = oneWeekAgo.toISOString();
            break;
          case 'all':
          default:
            dateFilter = null;
            break;
        }
        
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

        if (dateFilter) {
          query.gte('started_at', dateFilter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching execution logs:', error);
          return [];
        }

        console.log('Execution logs fetched:', data?.length || 0, 'logs');
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
