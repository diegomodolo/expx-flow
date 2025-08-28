import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PeriodComparison {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  comparison_name: string;
  period_1_start: string;
  period_1_end: string;
  period_1_label: string;
  period_2_start: string;
  period_2_end: string;
  period_2_label: string;
  status: 'pending' | 'syncing' | 'completed' | 'error';
  sync_progress: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PeriodComparisonCampaign {
  id: string;
  comparison_id: string;
  period_number: number;
  facebook_campaign_id: string;
  campaign_name: string;
  status: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpa: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
}

export interface ComparisonMetrics {
  period1: {
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    impressions: number;
    clicks: number;
    reach: number;
    campaigns_count: number;
  };
  period2: {
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    impressions: number;
    clicks: number;
    reach: number;
    campaigns_count: number;
  };
  changes: {
    spend_change: number;
    spend_change_pct: number;
    conversions_change: number;
    conversions_change_pct: number;
    ctr_change: number;
    ctr_change_pct: number;
    cpc_change: number;
    cpc_change_pct: number;
    cpa_change: number;
    cpa_change_pct: number;
    impressions_change: number;
    impressions_change_pct: number;
    clicks_change: number;
    clicks_change_pct: number;
    reach_change: number;
    reach_change_pct: number;
  };
}

export function usePeriodComparisons(clientId?: string) {
  const [comparisons, setComparisons] = useState<PeriodComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComparisons = async () => {
    if (!user || !clientId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("period_comparisons")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComparisons((data || []) as PeriodComparison[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar comparações");
    } finally {
      setLoading(false);
    }
  };

  const createComparison = async (data: {
    comparisonName: string;
    period1Start: string;
    period1End: string;
    period1Label: string;
    period2Start: string;
    period2End: string;
    period2Label: string;
    companyId: string;
  }) => {
    if (!user || !clientId) return null;

    try {
      const { data: comparison, error } = await supabase
        .from("period_comparisons")
        .insert([{
          client_id: clientId,
          company_id: data.companyId,
          user_id: user.id,
          comparison_name: data.comparisonName,
          period_1_start: data.period1Start,
          period_1_end: data.period1End,
          period_1_label: data.period1Label,
          period_2_start: data.period2Start,
          period_2_end: data.period2End,
          period_2_label: data.period2Label,
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchComparisons();
      return comparison;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar comparação");
      return null;
    }
  };

  const syncComparison = async (comparisonId: string) => {
    try {
      toast({
        title: "Sincronização iniciada",
        description: "Buscando dados dos períodos selecionados...",
      });

      const { error } = await supabase.functions.invoke('sync-period-comparison', {
        body: { comparisonId }
      });

      if (error) throw error;

      // Start polling for updates
      const pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('period_comparisons')
          .select('status, sync_progress, error_message')
          .eq('id', comparisonId)
          .single();

        if (data?.status === 'completed') {
          clearInterval(pollInterval);
          toast({
            title: "Sincronização concluída",
            description: "Os dados foram sincronizados com sucesso!",
          });
          await fetchComparisons();
        } else if (data?.status === 'error') {
          clearInterval(pollInterval);
          toast({
            title: "Erro na sincronização",
            description: data.error_message || "Erro desconhecido",
            variant: "destructive",
          });
          await fetchComparisons();
        }
      }, 2000);

      // Clear interval after 5 minutes to avoid infinite polling
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar comparação");
      toast({
        title: "Erro na sincronização",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getComparisonCampaigns = async (comparisonId: string): Promise<PeriodComparisonCampaign[]> => {
    try {
      const { data, error } = await supabase
        .from("period_comparison_campaigns")
        .select("*")
        .eq("comparison_id", comparisonId)
        .order("campaign_name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching comparison campaigns:", err);
      return [];
    }
  };

  const getComparisonMetrics = async (comparisonId: string): Promise<ComparisonMetrics | null> => {
    try {
      const campaigns = await getComparisonCampaigns(comparisonId);
      
      const period1Campaigns = campaigns.filter(c => c.period_number === 1);
      const period2Campaigns = campaigns.filter(c => c.period_number === 2);

      const calculateTotals = (campaigns: PeriodComparisonCampaign[]) => ({
        spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
        conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
        impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
        clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
        reach: campaigns.reduce((sum, c) => sum + c.reach, 0),
        ctr: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length : 0,
        cpc: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.cpc, 0) / campaigns.length : 0,
        cpa: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.cpa, 0) / campaigns.length : 0,
        campaigns_count: campaigns.length,
      });

      const period1 = calculateTotals(period1Campaigns);
      const period2 = calculateTotals(period2Campaigns);

      const calculateChange = (current: number, previous: number) => ({
        absolute: current - previous,
        percentage: previous > 0 ? ((current - previous) / previous) * 100 : 0
      });

      const spendChange = calculateChange(period2.spend, period1.spend);
      const conversionsChange = calculateChange(period2.conversions, period1.conversions);
      const ctrChange = calculateChange(period2.ctr, period1.ctr);
      const cpcChange = calculateChange(period2.cpc, period1.cpc);
      const cpaChange = calculateChange(period2.cpa, period1.cpa);
      const impressionsChange = calculateChange(period2.impressions, period1.impressions);
      const clicksChange = calculateChange(period2.clicks, period1.clicks);
      const reachChange = calculateChange(period2.reach, period1.reach);

      return {
        period1,
        period2,
        changes: {
          spend_change: spendChange.absolute,
          spend_change_pct: spendChange.percentage,
          conversions_change: conversionsChange.absolute,
          conversions_change_pct: conversionsChange.percentage,
          ctr_change: ctrChange.absolute,
          ctr_change_pct: ctrChange.percentage,
          cpc_change: cpcChange.absolute,
          cpc_change_pct: cpcChange.percentage,
          cpa_change: cpaChange.absolute,
          cpa_change_pct: cpaChange.percentage,
          impressions_change: impressionsChange.absolute,
          impressions_change_pct: impressionsChange.percentage,
          clicks_change: clicksChange.absolute,
          clicks_change_pct: clicksChange.percentage,
          reach_change: reachChange.absolute,
          reach_change_pct: reachChange.percentage,
        }
      };
    } catch (err) {
      console.error("Error calculating comparison metrics:", err);
      return null;
    }
  };

  const deleteComparison = async (comparisonId: string) => {
    try {
      const { error } = await supabase
        .from("period_comparisons")
        .delete()
        .eq("id", comparisonId);

      if (error) throw error;
      
      await fetchComparisons();
      toast({
        title: "Comparação removida",
        description: "A comparação foi removida com sucesso.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover comparação");
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchComparisons();
    }
  }, [user, clientId]);

  return {
    comparisons,
    loading,
    error,
    fetchComparisons,
    createComparison,
    syncComparison,
    getComparisonCampaigns,
    getComparisonMetrics,
    deleteComparison,
  };
}