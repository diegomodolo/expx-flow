import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Platform = 'meta' | 'google' | 'all';

export interface UnifiedCampaign {
  id: string;
  platform: 'meta' | 'google';
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  reach?: number;
  frequency?: number;
  campaign_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client_id: string;
  company_id: string;
}

interface UseUnifiedCampaignsOptions {
  clientId?: string;
  companyId?: string;
  platform?: Platform;
  includeInactive?: boolean;
}

export function useUnifiedCampaigns(options: UseUnifiedCampaignsOptions = {}) {
  const { clientId, companyId, platform = 'all', includeInactive = false } = options;

  return useQuery({
    queryKey: ['unified-campaigns', clientId, companyId, platform, includeInactive],
    queryFn: async () => {
      const campaigns: UnifiedCampaign[] = [];

      // Fetch Meta campaigns
      if (platform === 'all' || platform === 'meta') {
        let metaQuery = supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientId) {
          metaQuery = metaQuery.eq('client_id', clientId);
        }
        if (companyId) {
          metaQuery = metaQuery.eq('company_id', companyId);
        }
        if (!includeInactive) {
          metaQuery = metaQuery.eq('is_active', true);
        }

        const { data: metaCampaigns, error: metaError } = await metaQuery;

        if (metaError) throw metaError;

        if (metaCampaigns) {
          campaigns.push(
            ...metaCampaigns.map((campaign) => ({
              ...campaign,
              platform: 'meta' as const,
              spend: Number(campaign.spend) || 0,
              ctr: Number(campaign.ctr) || 0,
              cpc: Number(campaign.cpc) || 0,
              cpa: Number(campaign.cpa) || 0,
              campaign_type: campaign.objective,
            }))
          );
        }
      }

      // Fetch Google campaigns
      if (platform === 'all' || platform === 'google') {
        let googleQuery = supabase
          .from('google_campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientId) {
          googleQuery = googleQuery.eq('client_id', clientId);
        }
        if (companyId) {
          googleQuery = googleQuery.eq('company_id', companyId);
        }
        if (!includeInactive) {
          googleQuery = googleQuery.eq('is_active', true);
        }

        const { data: googleCampaigns, error: googleError } = await googleQuery;

        if (googleError) throw googleError;

        if (googleCampaigns) {
          campaigns.push(
            ...googleCampaigns.map((campaign) => ({
              ...campaign,
              platform: 'google' as const,
              spend: Number(campaign.spend) || 0,
              ctr: Number(campaign.ctr) || 0,
              cpc: Number(campaign.cpc) || 0,
              cpa: Number(campaign.cpa) || 0,
            }))
          );
        }
      }

      // Sort by spend descending
      campaigns.sort((a, b) => b.spend - a.spend);

      return campaigns;
    },
    enabled: !!companyId || !!clientId,
  });
}

export function useUnifiedMetrics(options: UseUnifiedCampaignsOptions = {}) {
  const { data: campaigns, isLoading } = useUnifiedCampaigns(options);

  const metrics = {
    total_spend: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    average_ctr: 0,
    average_cpc: 0,
    average_cpa: 0,
    active_campaigns: 0,
    meta: {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      campaigns: 0,
    },
    google: {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      campaigns: 0,
    },
  };

  if (campaigns) {
    campaigns.forEach((campaign) => {
      metrics.total_spend += campaign.spend;
      metrics.total_impressions += campaign.impressions;
      metrics.total_clicks += campaign.clicks;
      metrics.total_conversions += campaign.conversions;
      
      if (campaign.is_active) {
        metrics.active_campaigns++;
      }

      if (campaign.platform === 'meta') {
        metrics.meta.spend += campaign.spend;
        metrics.meta.impressions += campaign.impressions;
        metrics.meta.clicks += campaign.clicks;
        metrics.meta.conversions += campaign.conversions;
        metrics.meta.campaigns++;
      } else {
        metrics.google.spend += campaign.spend;
        metrics.google.impressions += campaign.impressions;
        metrics.google.clicks += campaign.clicks;
        metrics.google.conversions += campaign.conversions;
        metrics.google.campaigns++;
      }
    });

    if (metrics.total_impressions > 0) {
      metrics.average_ctr = (metrics.total_clicks / metrics.total_impressions) * 100;
    }
    if (metrics.total_clicks > 0) {
      metrics.average_cpc = metrics.total_spend / metrics.total_clicks;
    }
    if (metrics.total_conversions > 0) {
      metrics.average_cpa = metrics.total_spend / metrics.total_conversions;
    }
  }

  return {
    metrics,
    isLoading,
    campaigns,
  };
}
