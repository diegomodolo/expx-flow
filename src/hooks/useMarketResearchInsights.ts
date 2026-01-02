import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface MarketResearchInsight {
  id: string;
  client_id: string;
  company_id: string;
  topic: string;
  pain_point: string | null;
  opportunity: string | null;
  sentiment: string | null;
  relevance_score: number | null;
  source_url: string | null;
  source_type: string;
  raw_content: string | null;
  extracted_quotes: string[] | null;
  used_in_ads: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useMarketResearchInsights = (clientId?: string) => {
  const [insights, setInsights] = useState<MarketResearchInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchInsights = async () => {
    if (!user?.id || !activeCompany?.company_id || !clientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_research_insights')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('relevance_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      setInsights(data?.map(item => ({
        ...item,
        extracted_quotes: item.extracted_quotes as string[] | null
      })) || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar insights');
    } finally {
      setLoading(false);
    }
  };

  const createInsight = async (insightData: Partial<MarketResearchInsight>) => {
    if (!user?.id || !activeCompany?.company_id || !clientId) {
      throw new Error('Dados de autenticação não disponíveis');
    }

    if (!insightData.topic) {
      throw new Error('O tópico é obrigatório');
    }

    const { data, error } = await supabase
      .from('market_research_insights')
      .insert({
        topic: insightData.topic,
        pain_point: insightData.pain_point,
        opportunity: insightData.opportunity,
        sentiment: insightData.sentiment || 'neutral',
        relevance_score: insightData.relevance_score || 50,
        source_url: insightData.source_url,
        source_type: insightData.source_type || 'manual',
        raw_content: insightData.raw_content,
        extracted_quotes: insightData.extracted_quotes,
        client_id: clientId,
        company_id: activeCompany.company_id,
      })
      .select()
      .single();

    if (error) throw error;
    
    setInsights(prev => [{ ...data, extracted_quotes: data.extracted_quotes as string[] | null }, ...prev]);
    toast.success('Tema de pesquisa adicionado com sucesso!');
    return data;
  };

  const updateInsight = async (id: string, updates: Partial<MarketResearchInsight>) => {
    const { data, error } = await supabase
      .from('market_research_insights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setInsights(prev => prev.map(insight => 
      insight.id === id ? { ...data, extracted_quotes: data.extracted_quotes as string[] | null } : insight
    ));
    toast.success('Tema atualizado com sucesso!');
    return data;
  };

  const deleteInsight = async (id: string) => {
    const { error } = await supabase
      .from('market_research_insights')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setInsights(prev => prev.filter(insight => insight.id !== id));
    toast.success('Tema removido com sucesso!');
  };

  useEffect(() => {
    if (clientId) {
      fetchInsights();
    }
  }, [user?.id, activeCompany?.company_id, clientId]);

  return {
    insights,
    loading,
    error,
    createInsight,
    updateInsight,
    deleteInsight,
    refetch: fetchInsights
  };
};
