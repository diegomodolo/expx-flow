import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

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
      console.log('=== DEBUG EXECUTION LOGS START ===');
      console.log('User ID:', user?.id);
      console.log('User Full:', user);
      console.log('Active Company ID:', activeCompany?.company_id);
      console.log('Active Company Full:', activeCompany);
      console.log('Client ID Filter:', clientId);
      console.log('Period Filter:', periodFilter);
      
      if (!user) {
        console.error('❌ No user authenticated');
        toast.error('Usuário não autenticado');
        return [];
      }
      
      if (!activeCompany?.company_id) {
        console.error('❌ No active company selected');
        toast.error('Nenhuma empresa ativa selecionada');
        return [];
      }

      try {
        // Test query to verify user has access to company
        console.log('🔍 Testing user access to company...');
        const { data: accessTest, error: accessError } = await supabase
          .from('company_members')
          .select('company_id, role')
          .eq('user_id', user.id)
          .eq('company_id', activeCompany.company_id)
          .single();
        
        console.log('Access Test Result:', accessTest);
        console.log('Access Test Error:', accessError);
        
        if (accessError || !accessTest) {
          console.error('❌ User does not have access to this company');
          toast.error('Você não tem acesso a esta empresa');
          return [];
        }
        
        console.log('✅ User has access to company with role:', accessTest.role);
        
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
        
        console.log('📅 Date filter:', dateFilter);
        
        const query = supabase
          .from('automation_execution_logs' as any)
          .select('*')
          .eq('company_id', activeCompany.company_id)
          .order('started_at', { ascending: false })
          .limit(limit);

        if (clientId) {
          console.log('🎯 Filtering by client:', clientId);
          query.eq('client_id', clientId);
        }

        if (dateFilter) {
          console.log('📆 Filtering by date >= ', dateFilter);
          query.gte('started_at', dateFilter);
        }

        console.log('🚀 Executing query...');
        const { data, error } = await query;

        if (error) {
          console.error('❌ Error fetching execution logs:', error);
          toast.error(`Erro ao carregar logs: ${error.message}`);
          return [];
        }

        console.log('✅ Execution logs fetched successfully:', data?.length || 0, 'logs');
        console.log('📊 Logs data:', data);
        console.log('=== DEBUG EXECUTION LOGS END ===');
        
        return (data || []) as unknown as AutomationExecutionLog[];
      } catch (error) {
        console.error('❌ Exception in execution logs query:', error);
        toast.error(`Erro inesperado: ${error}`);
        return [];
      }
    },
    enabled: !!user && !!activeCompany?.company_id,
    retry: false,
    refetchOnWindowFocus: false,
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
