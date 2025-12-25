import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Platform = 'meta' | 'google' | 'all';

export interface UnifiedAd {
  id: string;
  platform: 'meta' | 'google';
  name: string;
  status: string;
  is_active: boolean;
  campaign_id: string;
  ad_group_id: string; // ad_set_id for Meta, ad_group_id for Google
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  reach?: number;
  frequency?: number;
  // Creative fields
  creative_type?: string;
  creative_title?: string;
  creative_body?: string;
  creative_description?: string;
  image_url?: string;
  video_url?: string;
  link_url?: string;
  call_to_action?: string;
  // Engagement (Meta specific)
  likes?: number;
  comments?: number;
  shares?: number;
  video_views?: number;
  // Headlines (Google specific)
  headlines?: string[];
  descriptions?: string[];
  // Common
  created_at: string;
  updated_at: string;
  client_id: string;
  company_id: string;
}

interface UseUnifiedAdsOptions {
  clientId?: string;
  companyId?: string;
  campaignId?: string;
  adGroupId?: string;
  platform?: Platform;
  includeInactive?: boolean;
}

export function useUnifiedAds(options: UseUnifiedAdsOptions = {}) {
  const { clientId, companyId, campaignId, adGroupId, platform = 'all', includeInactive = true } = options;

  return useQuery({
    queryKey: ['unified-ads', clientId, companyId, campaignId, adGroupId, platform, includeInactive],
    queryFn: async () => {
      const ads: UnifiedAd[] = [];

      // Fetch Meta ads
      if (platform === 'all' || platform === 'meta') {
        let metaQuery = supabase
          .from('ads')
          .select('*')
          .order('conversions', { ascending: false });

        if (clientId) {
          metaQuery = metaQuery.eq('client_id', clientId);
        }
        if (companyId) {
          metaQuery = metaQuery.eq('company_id', companyId);
        }
        if (campaignId) {
          metaQuery = metaQuery.eq('campaign_id', campaignId);
        }
        if (adGroupId) {
          metaQuery = metaQuery.eq('ad_set_id', adGroupId);
        }
        if (!includeInactive) {
          metaQuery = metaQuery.eq('is_active', true);
        }

        const { data: metaAds, error: metaError } = await metaQuery;

        if (metaError) throw metaError;

        if (metaAds) {
          ads.push(
            ...metaAds.map((ad) => ({
              id: ad.id,
              platform: 'meta' as const,
              name: ad.name,
              status: ad.status,
              is_active: ad.is_active,
              campaign_id: ad.campaign_id,
              ad_group_id: ad.ad_set_id,
              spend: Number(ad.spend) || 0,
              impressions: Number(ad.impressions) || 0,
              clicks: Number(ad.clicks) || 0,
              conversions: Number(ad.conversions) || 0,
              ctr: Number(ad.ctr) || 0,
              cpc: Number(ad.cpc) || 0,
              cpa: Number(ad.cpa) || 0,
              reach: Number(ad.reach) || 0,
              frequency: Number(ad.frequency) || 0,
              creative_type: ad.creative_type,
              creative_title: ad.creative_title,
              creative_body: ad.creative_body,
              creative_description: ad.creative_description,
              image_url: ad.image_url,
              video_url: ad.video_url,
              link_url: ad.link_url,
              call_to_action: ad.call_to_action,
              likes: Number(ad.likes) || 0,
              comments: Number(ad.comments) || 0,
              shares: Number(ad.shares) || 0,
              video_views: Number(ad.video_views) || 0,
              created_at: ad.created_at,
              updated_at: ad.updated_at,
              client_id: ad.client_id,
              company_id: ad.company_id || '',
            }))
          );
        }
      }

      // Fetch Google ads
      if (platform === 'all' || platform === 'google') {
        let googleQuery = supabase
          .from('google_ads')
          .select('*')
          .order('conversions', { ascending: false });

        if (clientId) {
          googleQuery = googleQuery.eq('client_id', clientId);
        }
        if (companyId) {
          googleQuery = googleQuery.eq('company_id', companyId);
        }
        if (campaignId) {
          googleQuery = googleQuery.eq('campaign_id', campaignId);
        }
        if (adGroupId) {
          googleQuery = googleQuery.eq('ad_group_id', adGroupId);
        }
        if (!includeInactive) {
          googleQuery = googleQuery.eq('is_active', true);
        }

        const { data: googleAds, error: googleError } = await googleQuery;

        if (googleError) throw googleError;

        if (googleAds) {
          ads.push(
            ...googleAds.map((ad) => {
              const headlines = Array.isArray(ad.headlines) ? ad.headlines as string[] : [];
              const descriptions = Array.isArray(ad.descriptions) ? ad.descriptions as string[] : [];
              
              return {
                id: ad.id,
                platform: 'google' as const,
                name: ad.name,
                status: ad.status,
                is_active: ad.is_active,
                campaign_id: ad.campaign_id,
                ad_group_id: ad.ad_group_id,
                spend: Number(ad.spend) || 0,
                impressions: Number(ad.impressions) || 0,
                clicks: Number(ad.clicks) || 0,
                conversions: Number(ad.conversions) || 0,
                ctr: Number(ad.ctr) || 0,
                cpc: Number(ad.cpc) || 0,
                cpa: Number(ad.cpa) || 0,
                creative_type: ad.ad_type || 'TEXT',
                creative_title: headlines[0] || ad.name,
                creative_body: descriptions[0] || '',
                creative_description: descriptions[1] || '',
                link_url: ad.final_url || '',
                headlines,
                descriptions,
                created_at: ad.created_at,
                updated_at: ad.updated_at,
                client_id: ad.client_id,
                company_id: ad.company_id || '',
              };
            })
          );
        }
      }

      // Sort by conversions descending
      ads.sort((a, b) => b.conversions - a.conversions);

      return ads;
    },
    enabled: !!clientId,
  });
}

export function useUnifiedAdsMetrics(options: UseUnifiedAdsOptions = {}) {
  const { data: ads, isLoading, refetch } = useUnifiedAds(options);

  const metrics = {
    total: 0,
    active: 0,
    totalSpend: 0,
    totalClicks: 0,
    totalImpressions: 0,
    totalConversions: 0,
    avgCTR: 0,
    avgEngagement: 0,
    meta: { count: 0, spend: 0 },
    google: { count: 0, spend: 0 },
  };

  if (ads) {
    metrics.total = ads.length;
    let totalEngagement = 0;
    let totalReach = 0;
    
    ads.forEach((ad) => {
      metrics.totalSpend += ad.spend;
      metrics.totalClicks += ad.clicks;
      metrics.totalImpressions += ad.impressions;
      metrics.totalConversions += ad.conversions;
      
      if (ad.is_active) {
        metrics.active++;
      }

      if (ad.platform === 'meta') {
        metrics.meta.count++;
        metrics.meta.spend += ad.spend;
        totalEngagement += (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0);
        totalReach += ad.reach || 0;
      } else {
        metrics.google.count++;
        metrics.google.spend += ad.spend;
      }
    });

    if (metrics.totalImpressions > 0) {
      metrics.avgCTR = (metrics.totalClicks / metrics.totalImpressions) * 100;
    }
    if (totalReach > 0) {
      metrics.avgEngagement = (totalEngagement / totalReach) * 100;
    }
  }

  return {
    ads: ads || [],
    metrics,
    isLoading,
    refetch,
  };
}
