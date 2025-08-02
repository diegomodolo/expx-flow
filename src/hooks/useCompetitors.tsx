import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface Competitor {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  name: string;
  company_name: string;
  facebook_page_name?: string;
  instagram_handle?: string;
  website_url?: string;
  industry?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorAd {
  id: string;
  competitor_id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  platform: string;
  ad_title?: string;
  ad_description?: string;
  ad_copy?: string;
  call_to_action?: string;
  image_url?: string;
  video_url?: string;
  landing_page_url?: string;
  ad_type?: string;
  estimated_performance?: string;
  notes?: string;
  date_spotted: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCompetitors = (clientId?: string) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchCompetitors = async () => {
    if (!user?.id || !activeCompany?.company_id || !clientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompetitors(data || []);
    } catch (err) {
      console.error('Error fetching competitors:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar concorrentes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitorAds = async () => {
    if (!user?.id || !activeCompany?.company_id || !clientId) return;

    try {
      const { data, error } = await supabase
        .from('competitor_ads')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true)
        .order('date_spotted', { ascending: false });

      if (error) throw error;
      setCompetitorAds(data || []);
    } catch (err) {
      console.error('Error fetching competitor ads:', err);
    }
  };

  const createCompetitor = async (competitorData: Partial<Competitor>) => {
    if (!user?.id || !activeCompany?.company_id || !clientId) {
      throw new Error('Dados de autenticação não disponíveis');
    }

    // Ensure required fields are present
    if (!competitorData.name || !competitorData.company_name) {
      throw new Error('Nome e empresa do concorrente são obrigatórios');
    }

    const { data, error } = await supabase
      .from('competitors')
      .insert({
        name: competitorData.name,
        company_name: competitorData.company_name,
        facebook_page_name: competitorData.facebook_page_name,
        instagram_handle: competitorData.instagram_handle,
        website_url: competitorData.website_url,
        industry: competitorData.industry,
        description: competitorData.description,
        client_id: clientId,
        company_id: activeCompany.company_id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    setCompetitors(prev => [data, ...prev]);
    toast.success('Concorrente adicionado com sucesso!');
    return data;
  };

  const updateCompetitor = async (id: string, updates: Partial<Competitor>) => {
    const { data, error } = await supabase
      .from('competitors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setCompetitors(prev => prev.map(comp => comp.id === id ? data : comp));
    toast.success('Concorrente atualizado com sucesso!');
    return data;
  };

  const deleteCompetitor = async (id: string) => {
    const { error } = await supabase
      .from('competitors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setCompetitors(prev => prev.filter(comp => comp.id !== id));
    toast.success('Concorrente removido com sucesso!');
  };

  const createCompetitorAd = async (adData: Partial<CompetitorAd>) => {
    if (!user?.id || !activeCompany?.company_id || !clientId) {
      throw new Error('Dados de autenticação não disponíveis');
    }

    // Ensure required fields are present
    if (!adData.competitor_id) {
      throw new Error('ID do concorrente é obrigatório');
    }

    const { data, error } = await supabase
      .from('competitor_ads')
      .insert({
        competitor_id: adData.competitor_id,
        platform: adData.platform || 'Facebook Ads',
        ad_title: adData.ad_title,
        ad_description: adData.ad_description,
        ad_copy: adData.ad_copy,
        call_to_action: adData.call_to_action,
        image_url: adData.image_url,
        video_url: adData.video_url,
        landing_page_url: adData.landing_page_url,
        ad_type: adData.ad_type,
        estimated_performance: adData.estimated_performance,
        notes: adData.notes,
        date_spotted: adData.date_spotted || new Date().toISOString().split('T')[0],
        client_id: clientId,
        company_id: activeCompany.company_id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    setCompetitorAds(prev => [data, ...prev]);
    toast.success('Anúncio do concorrente adicionado com sucesso!');
    return data;
  };

  const updateCompetitorAd = async (id: string, updates: Partial<CompetitorAd>) => {
    const { data, error } = await supabase
      .from('competitor_ads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setCompetitorAds(prev => prev.map(ad => ad.id === id ? data : ad));
    toast.success('Anúncio atualizado com sucesso!');
    return data;
  };

  const deleteCompetitorAd = async (id: string) => {
    const { error } = await supabase
      .from('competitor_ads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setCompetitorAds(prev => prev.filter(ad => ad.id !== id));
    toast.success('Anúncio removido com sucesso!');
  };

  const generateCompetitiveAnalysis = async (clientData: any, clientAds: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitor-insights', {
        body: {
          clientData,
          clientAds,
          competitorData: competitors,
          competitorAds: competitorAds
        }
      });

      if (error) throw error;
      return data.analysis;
    } catch (err) {
      console.error('Error generating competitive analysis:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchCompetitors();
      fetchCompetitorAds();
    }
  }, [user?.id, activeCompany?.company_id, clientId]);

  return {
    competitors,
    competitorAds,
    loading,
    error,
    createCompetitor,
    updateCompetitor,
    deleteCompetitor,
    createCompetitorAd,
    updateCompetitorAd,
    deleteCompetitorAd,
    generateCompetitiveAnalysis,
    refetch: () => {
      fetchCompetitors();
      fetchCompetitorAds();
    }
  };
};