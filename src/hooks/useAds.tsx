import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompany } from '@/contexts/CompanyContext';

export interface Ad {
  id: string;
  facebook_id: string;
  ad_set_id: string;
  campaign_id: string;
  client_id: string;
  name: string;
  status: string;
  creative_type: string;
  creative_body: string;
  creative_title: string;
  creative_description: string;
  image_url: string;
  video_url: string;
  link_url: string;
  call_to_action: string;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAds = (clientId?: string) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchAds = async () => {
    if (!user?.id || !activeCompany?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ads')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setAds(data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [user?.id, activeCompany?.company_id, clientId]);

  return {
    ads,
    loading,
    error,
    refetch: fetchAds,
  };
};