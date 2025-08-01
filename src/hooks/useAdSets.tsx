import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompany } from '@/contexts/CompanyContext';

export interface AdSet {
  id: string;
  facebook_id: string;
  campaign_id: string;
  client_id: string;
  name: string;
  status: string;
  daily_budget: number;
  lifetime_budget: number;
  bid_strategy: string;
  optimization_goal: string;
  targeting: string;
  cpm: number;
  ctr: number;
  cpc: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAdSets = (clientId?: string) => {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchAdSets = async () => {
    if (!user?.id || !activeCompany?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ad_sets')
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

      setAdSets(data || []);
    } catch (err) {
      console.error('Error fetching ad sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ad sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdSets();
  }, [user?.id, activeCompany?.company_id, clientId]);

  return {
    adSets,
    loading,
    error,
    refetch: fetchAdSets,
  };
};