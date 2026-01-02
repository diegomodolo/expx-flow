import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export type AdGenerationType = 'clone' | 'concept' | 'iteration';
export type AdGenerationStatus = 'pending' | 'approved' | 'rejected' | 'published';

export interface GeneratedAd {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  generation_type: AdGenerationType;
  source_ad_id: string | null;
  source_competitor_id: string | null;
  generated_content: {
    headline?: string;
    primary_text?: string;
    description?: string;
    call_to_action?: string;
    ad_type?: string;
    image_prompt?: string;
    image_url?: string;
    [key: string]: any;
  };
  concept_description: string | null;
  research_sources: any | null;
  quality_score: number | null;
  status: AdGenerationStatus;
  scheduled_for: string | null;
  generated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  meta_ad_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

export interface AdGenerationSchedule {
  id: string;
  client_id: string;
  company_id: string;
  is_active: boolean;
  generation_time: string;
  ads_per_day: number;
  clone_percentage: number;
  concept_percentage: number;
  iteration_percentage: number;
  autopilot_enabled: boolean;
  autopilot_min_quality_score: number | null;
  autopilot_max_daily_budget: number | null;
  last_generation_at: string | null;
  next_generation_at: string | null;
}

export function useAdGenerationQueue(clientId?: string) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [ads, setAds] = useState<GeneratedAd[]>([]);
  const [schedule, setSchedule] = useState<AdGenerationSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchAds = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      let query = supabase
        .from('ad_generation_queue')
        .select('*, clients(name, company)')
        .eq('company_id', activeCompany.id)
        .order('generated_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAds((data || []) as unknown as GeneratedAd[]);
    } catch (error) {
      console.error('Error fetching ad queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany?.id, clientId]);

  const fetchSchedule = useCallback(async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from('ad_generation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSchedule(data as unknown as AdGenerationSchedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAds();
    if (clientId) fetchSchedule();
  }, [fetchAds, fetchSchedule, clientId]);

  const generateAds = async (
    targetClientId: string,
    options?: {
      count?: number;
      generation_type?: AdGenerationType;
    }
  ) => {
    if (!user?.id || !activeCompany?.id) {
      toast.error('Usuário ou empresa não encontrado');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('daily-ad-generator', {
        body: {
          client_id: targetClientId,
          company_id: activeCompany.id,
          user_id: user.id,
          generation_type: options?.generation_type,
          count: options?.count || 10,
        },
      });

      if (error) throw error;

      toast.success(`${data.generated} anúncios gerados com sucesso!`);
      fetchAds();
      return data;
    } catch (error: any) {
      console.error('Error generating ads:', error);
      toast.error('Erro ao gerar anúncios: ' + error.message);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const updateAdStatus = async (adId: string, status: AdGenerationStatus, notes?: string) => {
    if (!user?.id) return;

    try {
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      };

      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ad_generation_queue')
        .update(updates)
        .eq('id', adId);

      if (error) throw error;

      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, ...updates } : ad
      ));

      toast.success(`Anúncio ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'publicado'}!`);
    } catch (error: any) {
      console.error('Error updating ad status:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };

  const bulkUpdateStatus = async (adIds: string[], status: AdGenerationStatus) => {
    if (!user?.id) return;

    try {
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      };

      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ad_generation_queue')
        .update(updates)
        .in('id', adIds);

      if (error) throw error;

      setAds(prev => prev.map(ad => 
        adIds.includes(ad.id) ? { ...ad, ...updates } : ad
      ));

      toast.success(`${adIds.length} anúncios atualizados!`);
    } catch (error: any) {
      console.error('Error bulk updating ads:', error);
      toast.error('Erro ao atualizar anúncios: ' + error.message);
    }
  };

  const updateSchedule = async (updates: Partial<AdGenerationSchedule>) => {
    if (!clientId || !activeCompany?.id) return;

    try {
      const { data: existing } = await supabase
        .from('ad_generation_schedules')
        .select('id')
        .eq('client_id', clientId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('ad_generation_schedules')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_generation_schedules')
          .insert({
            client_id: clientId,
            company_id: activeCompany.id,
            ...updates,
          });

        if (error) throw error;
      }

      fetchSchedule();
      toast.success('Configuração salva!');
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast.error('Erro ao salvar configuração: ' + error.message);
    }
  };

  const deleteAd = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('ad_generation_queue')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      setAds(prev => prev.filter(ad => ad.id !== adId));
      toast.success('Anúncio removido!');
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast.error('Erro ao remover anúncio: ' + error.message);
    }
  };

  return {
    ads,
    schedule,
    isLoading,
    isGenerating,
    generateAds,
    updateAdStatus,
    bulkUpdateStatus,
    updateSchedule,
    deleteAd,
    refetch: fetchAds,
  };
}
