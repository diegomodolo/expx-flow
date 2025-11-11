import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "./use-toast";

export interface AutomationRecommendation {
  id: string;
  rule_id: string;
  company_id: string;
  client_id: string | null;
  campaign_id: string | null;
  recommended_action: string;
  action_config: any;
  reason: string;
  conditions_met: any;
  campaign_data: any;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  executed_at: string | null;
  execution_log_id: string | null;
  expires_at: string;
  created_at: string;
}

export const useAutomationRecommendations = () => {
  const [recommendations, setRecommendations] = useState<AutomationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    if (!user || !activeCompany?.company_id) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from("campaign_automation_recommendations")
      .select(`
        *,
        rule:campaign_automation_rules(rule_name),
        client:clients(name),
        campaign:campaigns(name)
      `)
      .eq("company_id", activeCompany.company_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching recommendations:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar recomendações.",
        variant: "destructive",
      });
    } else {
      setRecommendations((data as any) || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user?.id, activeCompany?.company_id]);

  const approveRecommendation = async (recommendationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'execute-automation-recommendation',
        {
          body: {
            recommendation_id: recommendationId,
            action: 'approve',
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Recomendação aprovada",
        description: "A ação foi executada com sucesso.",
      });

      await fetchRecommendations();
      return data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const rejectRecommendation = async (recommendationId: string, notes?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'execute-automation-recommendation',
        {
          body: {
            recommendation_id: recommendationId,
            action: 'reject',
            notes,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Recomendação rejeitada",
        description: "A recomendação foi descartada.",
      });

      await fetchRecommendations();
      return data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    recommendations,
    loading,
    fetchRecommendations,
    approveRecommendation,
    rejectRecommendation,
  };
};
