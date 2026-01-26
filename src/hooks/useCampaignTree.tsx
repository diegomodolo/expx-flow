import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TreeNodeMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  cpm: number;
  roas?: number;
  reach?: number;
  frequency?: number;
}

export interface TreeNodeBudget {
  type: "daily" | "lifetime";
  amount: number;
  spent: number;
}

export interface TreeNode {
  id: string;
  type: "campaign" | "adset" | "ad";
  level: number;
  name: string;
  status: "active" | "paused" | "finished" | "deleted";
  isExpanded: boolean;
  platform: "meta" | "google";
  metrics: TreeNodeMetrics;
  budget?: TreeNodeBudget;
  facebookId?: string;
  targeting?: object;
  creativeUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  creativeBody?: string;
  creativeTitle?: string;
  creativeDescription?: string;
  creativeType?: string;
  callToAction?: string;
  linkUrl?: string;
  pixelId?: string;
  conversionEvent?: string;
  children?: TreeNode[];
  parentId?: string;
  needsSync?: boolean; // true when last_synced_at is null (item not yet synced with Meta)
  isSyncing?: boolean; // true when item is currently being synced in background
}

export interface ClientTargets {
  target_cpa: number;
  target_ctr: number;
  target_roas: number;
  target_cpc: number;
  target_cpm: number;
}

interface UseCampaignTreeOptions {
  campaignId?: string;
  clientId?: string;
  companyId?: string;
}

export function useCampaignTree(options: UseCampaignTreeOptions) {
  const { campaignId, clientId, companyId } = options;

  // Fetch Meta campaign
  const { data: metaCampaign, isLoading: loadingMetaCampaign } = useQuery({
    queryKey: ["campaign-tree-meta-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  // Fetch Google campaign (if Meta not found)
  const { data: googleCampaign, isLoading: loadingGoogleCampaign } = useQuery({
    queryKey: ["campaign-tree-google-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!campaignId && !metaCampaign,
  });

  // Fetch Meta ad sets for this campaign
  const { data: metaAdSets = [], isLoading: loadingMetaAdSets } = useQuery({
    queryKey: ["campaign-tree-meta-adsets", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_sets")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && !!metaCampaign,
  });

  // Fetch Meta ads for all ad sets
  const adSetIds = metaAdSets.map((adset) => adset.id);
  const { data: metaAds = [], isLoading: loadingMetaAds } = useQuery({
    queryKey: ["campaign-tree-meta-ads", campaignId, adSetIds],
    queryFn: async () => {
      if (adSetIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .in("ad_set_id", adSetIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: adSetIds.length > 0,
  });

  // Fetch Google ad groups
  const { data: googleAdGroups = [], isLoading: loadingGoogleAdGroups } = useQuery({
    queryKey: ["campaign-tree-google-adgroups", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ad_groups")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!campaignId && !!googleCampaign,
  });

  // Fetch Google ads
  const adGroupIds = googleAdGroups.map((ag) => ag.id);
  const { data: googleAds = [], isLoading: loadingGoogleAds } = useQuery({
    queryKey: ["campaign-tree-google-ads", campaignId, adGroupIds],
    queryFn: async () => {
      if (adGroupIds.length === 0) return [];
      const { data, error } = await supabase
        .from("google_ads")
        .select("*")
        .in("ad_group_id", adGroupIds)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: adGroupIds.length > 0,
  });

  // Fetch client benchmarks
  const { data: clientBenchmarks } = useQuery({
    queryKey: ["campaign-tree-benchmarks", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_metric_benchmarks")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!clientId,
  });

  // Build tree structure
  const treeData = useMemo(() => {
    const campaign = metaCampaign || googleCampaign;
    if (!campaign) return null;

    const platform: "meta" | "google" = metaCampaign ? "meta" : "google";

    const getStatus = (item: any): "active" | "paused" | "finished" | "deleted" => {
      if (item.status === "deleted" || item.status === "DELETED") {
        return "deleted";
      }
      if (item.status === "ACTIVE" || item.status === "active" || item.is_active === true) {
        return "active";
      }
      if (item.status === "PAUSED" || item.status === "paused" || item.is_active === false) {
        return "paused";
      }
      return "finished";
    };

    // Safely access properties that might not exist on all campaign types
    const campaignAny = campaign as any;
    
    // Calculate campaign CPM: (spend / impressions) * 1000
    const campaignImpressions = Number(campaign.impressions) || 0;
    const campaignSpend = Number(campaign.spend) || 0;
    const campaignCpm = campaignImpressions > 0 ? (campaignSpend / campaignImpressions) * 1000 : 0;

    const campaignNode: TreeNode = {
      id: campaign.id,
      type: "campaign",
      level: 0,
      name: campaign.name,
      status: getStatus(campaign),
      isExpanded: true,
      platform,
      facebookId: campaignAny.facebook_id || campaignAny.google_id,
      metrics: {
        spend: campaignSpend,
        impressions: campaignImpressions,
        clicks: Number(campaign.clicks) || 0,
        conversions: Number(campaign.conversions) || 0,
        ctr: Number(campaign.ctr) || 0,
        cpc: Number(campaign.cpc) || 0,
        cpa: Number(campaign.cpa) || 0,
        cpm: campaignCpm,
        roas: campaignAny.roas ? Number(campaignAny.roas) : undefined,
        reach: campaign.reach ? Number(campaign.reach) : undefined,
        frequency: campaign.frequency ? Number(campaign.frequency) : undefined,
      },
      budget: campaign.daily_budget
        ? { type: "daily", amount: Number(campaign.daily_budget), spent: Number(campaign.spend) || 0 }
        : campaignAny.lifetime_budget
        ? { type: "lifetime", amount: Number(campaignAny.lifetime_budget), spent: Number(campaign.spend) || 0 }
        : undefined,
      children: [],
    };

    // Build ad sets / ad groups
    if (platform === "meta") {
      campaignNode.children = metaAdSets.map((adset) => {
        const adSetAds = metaAds.filter((ad) => ad.ad_set_id === adset.id);

        const adSetNode: TreeNode = {
          id: adset.id,
          type: "adset",
          level: 1,
          name: adset.name,
          status: getStatus(adset),
          isExpanded: false,
          platform: "meta",
          facebookId: adset.facebook_id,
          parentId: campaign.id,
          targeting: adset.targeting ? JSON.parse(adset.targeting) : undefined,
          pixelId: (adset as any).pixel_id || undefined,
          conversionEvent: (adset as any).conversion_event || undefined,
          metrics: {
            spend: Number(adset.spend) || 0,
            impressions: Number(adset.impressions) || 0,
            clicks: Number(adset.clicks) || 0,
            conversions: Number(adset.conversions) || 0,
            ctr: Number(adset.ctr) || 0,
            cpc: Number(adset.cpc) || 0,
            cpa: Number(adset.cpa) || 0,
            cpm: Number((adset as any).cpm) || 0,
            reach: adset.reach ? Number(adset.reach) : undefined,
            frequency: adset.frequency ? Number(adset.frequency) : undefined,
          },
          budget: adset.daily_budget
            ? { type: "daily", amount: Number(adset.daily_budget), spent: Number(adset.spend) || 0 }
            : adset.lifetime_budget
            ? { type: "lifetime", amount: Number(adset.lifetime_budget), spent: Number(adset.spend) || 0 }
            : undefined,
          children: adSetAds.map((ad) => ({
            id: ad.id,
            type: "ad" as const,
            level: 2,
            name: ad.name,
            status: getStatus(ad),
            isExpanded: false,
            platform: "meta" as const,
            facebookId: ad.facebook_id,
            parentId: adset.id,
            creativeUrl: ad.image_url || ad.video_url,
            imageUrl: ad.image_url || undefined,
            videoUrl: ad.video_url || undefined,
            creativeBody: ad.creative_body,
            creativeTitle: ad.creative_title,
            creativeDescription: ad.creative_description,
            creativeType: ad.creative_type,
            // Parse call_to_action from JSON string to extract type
            callToAction: (() => {
              if (!ad.call_to_action) return undefined;
              try {
                const ctaObj = typeof ad.call_to_action === 'string' 
                  ? JSON.parse(ad.call_to_action) 
                  : ad.call_to_action;
                return ctaObj?.type || undefined;
              } catch {
                return ad.call_to_action; // fallback to raw value if not JSON
              }
            })(),
            linkUrl: ad.link_url,
            pixelId: (ad as any).pixel_id || undefined,
            metrics: {
              spend: Number(ad.spend) || 0,
              impressions: Number(ad.impressions) || 0,
              clicks: Number(ad.clicks) || 0,
              conversions: Number(ad.conversions) || 0,
              ctr: Number(ad.ctr) || 0,
              cpc: Number(ad.cpc) || 0,
              cpa: Number(ad.cpa) || 0,
              cpm: Number((ad as any).cpm) || 0,
              reach: ad.reach ? Number(ad.reach) : undefined,
              frequency: ad.frequency ? Number(ad.frequency) : undefined,
            },
          })),
        };

        return adSetNode;
      });
    } else {
      // Google
      campaignNode.children = googleAdGroups.map((adGroup) => {
        const groupAds = googleAds.filter((ad) => ad.ad_group_id === adGroup.id);
        const adGroupAny = adGroup as any;

        const adGroupNode: TreeNode = {
          id: adGroup.id,
          type: "adset",
          level: 1,
          name: adGroup.name,
          status: getStatus(adGroup),
          isExpanded: false,
          platform: "google",
          facebookId: adGroupAny.google_id,
          parentId: campaign.id,
          metrics: {
            spend: Number(adGroup.spend) || 0,
            impressions: Number(adGroup.impressions) || 0,
            clicks: Number(adGroup.clicks) || 0,
            conversions: Number(adGroup.conversions) || 0,
            ctr: Number(adGroup.ctr) || 0,
            cpc: Number(adGroup.cpc) || 0,
            cpa: Number(adGroup.cpa) || 0,
            cpm: Number((adGroup as any).cpm) || 0,
          },
          children: groupAds.map((ad) => {
            const adAny = ad as any;
            const headlines = ad.headlines as string[] | null;
            const descriptions = ad.descriptions as string[] | null;
            return {
              id: ad.id,
              type: "ad" as const,
              level: 2,
              name: ad.name || (headlines?.[0]) || "Anúncio",
              status: getStatus(ad),
              isExpanded: false,
              platform: "google" as const,
              facebookId: adAny.google_id,
              parentId: adGroup.id,
              creativeUrl: adAny.image_url,
              creativeTitle: headlines?.[0],
              creativeBody: descriptions?.[0],
              metrics: {
                spend: Number(ad.spend) || 0,
                impressions: Number(ad.impressions) || 0,
                clicks: Number(ad.clicks) || 0,
                conversions: Number(ad.conversions) || 0,
                ctr: Number(ad.ctr) || 0,
                cpc: Number(ad.cpc) || 0,
                cpa: Number(ad.cpa) || 0,
                cpm: Number((ad as any).cpm) || 0,
              },
            };
          }),
        };

        return adGroupNode;
      });
    }

    return campaignNode;
  }, [metaCampaign, googleCampaign, metaAdSets, metaAds, googleAdGroups, googleAds]);

  // Build targets from benchmarks or defaults
  const targets: ClientTargets = useMemo(() => {
    if (clientBenchmarks) {
      return {
        target_cpa: Number(clientBenchmarks.target_cpa) || 50,
        target_ctr: Number(clientBenchmarks.target_ctr) || 1.5,
        target_roas: Number(clientBenchmarks.target_roas) || 3,
        target_cpc: Number(clientBenchmarks.target_cpc) || 2,
        target_cpm: Number(clientBenchmarks.target_cpm) || 15,
      };
    }
    return {
      target_cpa: 50,
      target_ctr: 1.5,
      target_roas: 3,
      target_cpc: 2,
      target_cpm: 15,
    };
  }, [clientBenchmarks]);

  const isLoading =
    loadingMetaCampaign ||
    loadingGoogleCampaign ||
    loadingMetaAdSets ||
    loadingMetaAds ||
    loadingGoogleAdGroups ||
    loadingGoogleAds;

  return {
    treeData,
    isLoading,
    targets,
    campaign: metaCampaign || googleCampaign,
    platform: metaCampaign ? ("meta" as const) : ("google" as const),
  };
}

export function getHealthColor(
  metric: string,
  value: number,
  targets: ClientTargets
): "green" | "yellow" | "red" | "neutral" {
  if (!value || value === 0) return "neutral";

  switch (metric) {
    case "cpa":
      if (value <= targets.target_cpa) return "green";
      if (value <= targets.target_cpa * 1.3) return "yellow";
      return "red";
    case "ctr":
      if (value >= targets.target_ctr) return "green";
      if (value >= targets.target_ctr * 0.7) return "yellow";
      return "red";
    case "roas":
      if (value >= targets.target_roas) return "green";
      if (value >= targets.target_roas * 0.8) return "yellow";
      return "red";
    case "cpc":
      if (value <= targets.target_cpc) return "green";
      if (value <= targets.target_cpc * 1.3) return "yellow";
      return "red";
    case "cpm":
      if (value <= targets.target_cpm) return "green";
      if (value <= targets.target_cpm * 1.3) return "yellow";
      return "red";
    default:
      return "neutral";
  }
}
