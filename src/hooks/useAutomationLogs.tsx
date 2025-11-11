import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "./use-toast";

export interface AutomationLog {
  id: string;
  rule_id: string;
  company_id: string;
  client_id: string | null;
  campaign_id: string | null;
  action_type: string;
  action_result: 'success' | 'error' | 'skipped';
  error_message: string | null;
  old_name: string | null;
  new_name: string | null;
  old_budget: number | null;
  new_budget: number | null;
  old_status: string | null;
  new_status: string | null;
  rolled_back: boolean;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
  metadata: any;
  executed_at: string;
}

export const useAutomationLogs = (clientId?: string | null, limit?: number) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchLogs = async () => {
    if (!user || !activeCompany?.company_id) return;
    
    setLoading(true);
    
    let query = supabase
      .from("campaign_automation_logs")
      .select(`
        *,
        rule:campaign_automation_rules(rule_name),
        client:clients(name),
        campaign:campaigns(name)
      `)
      .eq("company_id", activeCompany.company_id)
      .order("executed_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs.",
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.id, activeCompany?.company_id, clientId, limit]);

  const rollbackAction = async (logId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'rollback-automation-action',
        {
          body: { log_id: logId },
        }
      );

      if (error) throw error;

      toast({
        title: "Ação revertida",
        description: "A ação foi revertida com sucesso.",
      });

      await fetchLogs();
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao reverter",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    logs,
    loading,
    fetchLogs,
    rollbackAction,
  };
};
