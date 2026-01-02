import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface AdWinner {
  id: string;
  client_id: string;
  company_id: string;
  ad_id: string | null;
  facebook_ad_id: string | null;
  ad_name: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
  days_running: number;
  is_winner: boolean;
  winner_reason: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WinnerAnalysisResult {
  success: boolean;
  analyzed: number;
  eligible: number;
  winners: AdWinner[];
  thresholds: {
    cpa: number;
    ctr: number;
    avgCPA: number;
    avgCTR: number;
  };
}

export function useAdWinners(clientId: string | null) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: winners, isLoading, error, refetch } = useQuery({
    queryKey: ['ad-winners', clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!clientId || !activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('ad_performance_winners')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .eq('is_winner', true)
        .order('conversions', { ascending: false });

      if (error) throw error;
      return data as AdWinner[];
    },
    enabled: !!clientId && !!activeCompany?.company_id,
  });

  const analyzeWinners = async (criteria?: Partial<{
    min_spend: number;
    min_days: number;
    min_conversions: number;
    cpa_threshold_percentile: number;
    ctr_threshold_percentile: number;
  }>): Promise<WinnerAnalysisResult | null> => {
    if (!clientId || !activeCompany?.company_id) {
      toast.error('Selecione um cliente primeiro');
      return null;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-ad-winners', {
        body: {
          client_id: clientId,
          company_id: activeCompany.company_id,
          criteria,
        },
      });

      if (error) throw error;

      toast.success(`Análise concluída: ${data.winners?.length || 0} vencedores identificados`);
      queryClient.invalidateQueries({ queryKey: ['ad-winners', clientId] });
      
      return data as WinnerAnalysisResult;
    } catch (error: any) {
      console.error('Error analyzing winners:', error);
      toast.error('Erro ao analisar vencedores: ' + error.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    winners: winners || [],
    isLoading,
    error,
    refetch,
    analyzeWinners,
    isAnalyzing,
  };
}
