import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Platform = 'meta' | 'google' | 'all';

export interface UnifiedAdGroup {
  id: string;
  platform: 'meta' | 'google';
  name: string;
  status: string;
  is_active: boolean;
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  reach?: number;
  frequency?: number;
  daily_budget?: number;
  lifetime_budget?: number;
  optimization_goal?: string;
  targeting?: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  company_id: string;
}

interface UseUnifiedAdGroupsOptions {
  clientId?: string;
  companyId?: string;
  campaignId?: string;
  platform?: Platform;
  includeInactive?: boolean;
}

export function useUnifiedAdGroups(options: UseUnifiedAdGroupsOptions = {}) {
  const { clientId, companyId, campaignId, platform = 'all', includeInactive = true } = options;

  return useQuery({
    queryKey: ['unified-ad-groups', clientId, companyId, campaignId, platform, includeInactive],
    queryFn: async () => {
      const adGroups: UnifiedAdGroup[] = [];

      // Fetch Meta ad sets
      if (platform === 'all' || platform === 'meta') {
        let metaQuery = supabase
          .from('ad_sets')
          .select('*')
          .order('spend', { ascending: false });

        if (clientId) {
          metaQuery = metaQuery.eq('client_id', clientId);
        }
        if (companyId) {
          metaQuery = metaQuery.eq('company_id', companyId);
        }
        if (campaignId) {
          metaQuery = metaQuery.eq('campaign_id', campaignId);
        }
        if (!includeInactive) {
          metaQuery = metaQuery.eq('is_active', true);
        }

        const { data: metaAdSets, error: metaError } = await metaQuery;

        if (metaError) throw metaError;

        if (metaAdSets) {
          adGroups.push(
            ...metaAdSets.map((adSet) => ({
              id: adSet.id,
              platform: 'meta' as const,
              name: adSet.name,
              status: adSet.status,
              is_active: adSet.is_active,
              campaign_id: adSet.campaign_id,
              spend: Number(adSet.spend) || 0,
              impressions: Number(adSet.impressions) || 0,
              clicks: Number(adSet.clicks) || 0,
              conversions: Number(adSet.conversions) || 0,
              ctr: Number(adSet.ctr) || 0,
              cpc: Number(adSet.cpc) || 0,
              cpa: Number(adSet.cpa) || 0,
              reach: Number(adSet.reach) || 0,
              frequency: Number(adSet.frequency) || 0,
              daily_budget: Number(adSet.daily_budget) || 0,
              lifetime_budget: Number(adSet.lifetime_budget) || 0,
              optimization_goal: adSet.optimization_goal,
              targeting: adSet.targeting,
              created_at: adSet.created_at,
              updated_at: adSet.updated_at,
              client_id: adSet.client_id,
              company_id: adSet.company_id || '',
            }))
          );
        }
      }

      // Fetch Google ad groups
      if (platform === 'all' || platform === 'google') {
        let googleQuery = supabase
          .from('google_ad_groups')
          .select('*')
          .order('spend', { ascending: false });

        if (clientId) {
          googleQuery = googleQuery.eq('client_id', clientId);
        }
        if (companyId) {
          googleQuery = googleQuery.eq('company_id', companyId);
        }
        if (campaignId) {
          googleQuery = googleQuery.eq('campaign_id', campaignId);
        }
        if (!includeInactive) {
          googleQuery = googleQuery.eq('is_active', true);
        }

        const { data: googleAdGroups, error: googleError } = await googleQuery;

        if (googleError) throw googleError;

        if (googleAdGroups) {
          adGroups.push(
            ...googleAdGroups.map((adGroup) => ({
              id: adGroup.id,
              platform: 'google' as const,
              name: adGroup.name,
              status: adGroup.status,
              is_active: adGroup.is_active,
              campaign_id: adGroup.campaign_id,
              spend: Number(adGroup.spend) || 0,
              impressions: Number(adGroup.impressions) || 0,
              clicks: Number(adGroup.clicks) || 0,
              conversions: Number(adGroup.conversions) || 0,
              ctr: Number(adGroup.ctr) || 0,
              cpc: Number(adGroup.cpc) || 0,
              cpa: Number(adGroup.cpa) || 0,
              daily_budget: 0,
              lifetime_budget: 0,
              created_at: adGroup.created_at,
              updated_at: adGroup.updated_at,
              client_id: adGroup.client_id,
              company_id: adGroup.company_id || '',
            }))
          );
        }
      }

      // Sort by spend descending
      adGroups.sort((a, b) => b.spend - a.spend);

      return adGroups;
    },
    enabled: !!clientId,
  });
}

export function useUnifiedAdGroupsMetrics(options: UseUnifiedAdGroupsOptions = {}) {
  const { data: adGroups, isLoading, refetch } = useUnifiedAdGroups(options);

  const metrics = {
    total: 0,
    active: 0,
    totalSpend: 0,
    totalClicks: 0,
    totalImpressions: 0,
    totalConversions: 0,
    avgCTR: 0,
    avgCPA: 0,
    meta: { count: 0, spend: 0 },
    google: { count: 0, spend: 0 },
  };

  if (adGroups) {
    metrics.total = adGroups.length;
    
    adGroups.forEach((ag) => {
      metrics.totalSpend += ag.spend;
      metrics.totalClicks += ag.clicks;
      metrics.totalImpressions += ag.impressions;
      metrics.totalConversions += ag.conversions;
      
      if (ag.is_active) {
        metrics.active++;
      }

      if (ag.platform === 'meta') {
        metrics.meta.count++;
        metrics.meta.spend += ag.spend;
      } else {
        metrics.google.count++;
        metrics.google.spend += ag.spend;
      }
    });

    if (metrics.totalImpressions > 0) {
      metrics.avgCTR = (metrics.totalClicks / metrics.totalImpressions) * 100;
    }
    if (metrics.totalConversions > 0) {
      metrics.avgCPA = metrics.totalSpend / metrics.totalConversions;
    }
  }

  return {
    adGroups: adGroups || [],
    metrics,
    isLoading,
    refetch,
  };
}
