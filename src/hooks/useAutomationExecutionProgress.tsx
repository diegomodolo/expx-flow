import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExecutionProgress {
  id: string;
  execution_id: string;
  company_id: string;
  client_id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  rule_id: string | null;
  rule_name: string;
  action_taken: string | null;
  action_details: unknown;
  error_message: string | null;
  created_at: string;
  facebook_id: string;
  message: string;
  metadata: unknown;
  status: string;
}

export function useAutomationExecutionProgress(executionId?: string | null) {
  return useQuery({
    queryKey: ['automation-execution-progress', executionId],
    queryFn: async () => {
      if (!executionId) return [];


      const { data, error } = await supabase
        .from('automation_execution_progress')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching execution progress:', error);
        throw error;
      }
      

      return data as ExecutionProgress[];
    },
    enabled: !!executionId,
  });
}
