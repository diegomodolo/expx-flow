import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TreeNode, TreeNodeMetrics, ClientTargets } from "./useCampaignTree";

export interface UseAllCampaignsTreeOptions {
  clientId?: string;
  companyId?: string;
  platform?: "meta" | "google" | "all";
  includeInactive?: boolean;
  syncingItems?: Set<string>; // Items currently being synced
}

export interface AllCampaignsTreeResult {
  campaigns: TreeNode[];
  isLoading: boolean;
  totalMetrics: TreeNodeMetrics;
  targets: ClientTargets;
  refetch: () => void;
  invalidateAndRefetch: () => Promise<void>;
}

export function useAllCampaignsTree(options: UseAllCampaignsTreeOptions): AllCampaignsTreeResult {
  const { clientId, companyId, platform = "all", includeInactive = true, syncingItems } = options;
  const queryClient = useQueryClient();

  // Fetch Meta campaigns (excluding deleted ones)
  const { data: metaCampaigns = [], isLoading: loadingMetaCampaigns, refetch: refetchMetaCampaigns } = useQuery({
    queryKey: ["all-campaigns-tree-meta", clientId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", clientId)
        .neq("status", "deleted") // Exclude soft-deleted campaigns
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "meta"),
  });

  // Fetch Google campaigns
  const { data: googleCampaigns = [], isLoading: loadingGoogleCampaigns, refetch: refetchGoogleCampaigns } = useQuery({
    queryKey: ["all-campaigns-tree-google", clientId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_campaigns")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "google"),
  });

  // Fetch all Meta ad sets for client (excluding deleted ones)
  const { data: allMetaAdSets = [], isLoading: loadingMetaAdSets, refetch: refetchMetaAdSets } = useQuery({
    queryKey: ["all-campaigns-tree-meta-adsets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_sets")
        .select("*")
        .eq("client_id", clientId)
        .neq("status", "deleted") // Exclude soft-deleted ad sets
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "meta"),
  });

  // Fetch all Meta ads for client (excluding deleted ones)
  const { data: allMetaAds = [], isLoading: loadingMetaAds, refetch: refetchMetaAds } = useQuery({
    queryKey: ["all-campaigns-tree-meta-ads", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("client_id", clientId)
        .neq("status", "deleted") // Exclude soft-deleted ads
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "meta"),
  });

  // Fetch all Google ad groups for client
  const { data: allGoogleAdGroups = [], isLoading: loadingGoogleAdGroups, refetch: refetchGoogleAdGroups } = useQuery({
    queryKey: ["all-campaigns-tree-google-adgroups", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ad_groups")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "google"),
  });

  // Fetch all Google ads for client
  const { data: allGoogleAds = [], isLoading: loadingGoogleAds, refetch: refetchGoogleAds } = useQuery({
    queryKey: ["all-campaigns-tree-google-ads", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ads")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!clientId && (platform === "all" || platform === "google"),
  });

  // Fetch client benchmarks
  const { data: clientBenchmarks } = useQuery({
    queryKey: ["all-campaigns-tree-benchmarks", clientId],
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

  // Helper to get status
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

  // Build tree for all campaigns
  const campaigns = useMemo(() => {
    const trees: TreeNode[] = [];

    // Build Meta campaign trees
    if (platform === "all" || platform === "meta") {
      metaCampaigns.forEach((campaign) => {
        const status = getStatus(campaign);
        if (!includeInactive && status !== "active") return;

        const campaignAdSets = allMetaAdSets.filter((adset) => adset.campaign_id === campaign.id);
        const campaignSpend = Number(campaign.spend) || 0;
        const campaignImpressions = Number(campaign.impressions) || 0;
        const campaignCpm = campaignImpressions > 0 ? (campaignSpend / campaignImpressions) * 1000 : 0;

        const campaignNode: TreeNode = {
          id: campaign.id,
          type: "campaign",
          level: 0,
          name: campaign.name,
          status,
          isExpanded: false,
          platform: "meta",
          facebookId: campaign.facebook_id,
          needsSync: !campaign.last_synced_at,
          isSyncing: syncingItems?.has(campaign.id),
          metrics: {
            spend: campaignSpend,
            impressions: campaignImpressions,
            clicks: Number(campaign.clicks) || 0,
            conversions: Number(campaign.conversions) || 0,
            ctr: Number(campaign.ctr) || 0,
            cpc: Number(campaign.cpc) || 0,
            cpa: Number(campaign.cpa) || 0,
            cpm: campaignCpm,
            reach: campaign.reach ? Number(campaign.reach) : undefined,
            frequency: campaign.frequency ? Number(campaign.frequency) : undefined,
          },
          budget: campaign.daily_budget
            ? { type: "daily", amount: Number(campaign.daily_budget), spent: campaignSpend }
            : (campaign as any).lifetime_budget
            ? { type: "lifetime", amount: Number((campaign as any).lifetime_budget), spent: campaignSpend }
            : undefined,
          children: campaignAdSets.map((adset) => {
            const adSetAds = allMetaAds.filter((ad) => ad.ad_set_id === adset.id);
            const adsetStatus = getStatus(adset);

            const adSetNode: TreeNode = {
              id: adset.id,
              type: "adset",
              level: 1,
              name: adset.name,
              status: adsetStatus,
              isExpanded: false,
              platform: "meta",
              facebookId: adset.facebook_id,
              parentId: campaign.id,
              needsSync: !adset.last_synced_at,
              isSyncing: syncingItems?.has(adset.id),
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
                needsSync: !ad.last_synced_at,
                isSyncing: syncingItems?.has(ad.id),
                creativeUrl: ad.image_url || ad.video_url,
                imageUrl: ad.image_url || undefined,
                videoUrl: ad.video_url || undefined,
                creativeBody: ad.creative_body,
                creativeTitle: ad.creative_title,
                creativeDescription: ad.creative_description,
                creativeType: ad.creative_type,
                callToAction: (() => {
                  if (!ad.call_to_action) return undefined;
                  try {
                    const ctaObj = typeof ad.call_to_action === 'string' 
                      ? JSON.parse(ad.call_to_action) 
                      : ad.call_to_action;
                    return ctaObj?.type || undefined;
                  } catch {
                    return ad.call_to_action;
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
          }),
        };
        trees.push(campaignNode);
      });
    }

    // Build Google campaign trees
    if (platform === "all" || platform === "google") {
      googleCampaigns.forEach((campaign) => {
        const status = getStatus(campaign);
        if (!includeInactive && status !== "active") return;

        const campaignAdGroups = allGoogleAdGroups.filter((ag) => ag.campaign_id === campaign.id);
        const campaignSpend = Number(campaign.spend) || 0;
        const campaignImpressions = Number(campaign.impressions) || 0;
        const campaignCpm = campaignImpressions > 0 ? (campaignSpend / campaignImpressions) * 1000 : 0;

        const campaignNode: TreeNode = {
          id: campaign.id,
          type: "campaign",
          level: 0,
          name: campaign.name,
          status,
          isExpanded: false,
          platform: "google",
          facebookId: (campaign as any).google_id,
          metrics: {
            spend: campaignSpend,
            impressions: campaignImpressions,
            clicks: Number(campaign.clicks) || 0,
            conversions: Number(campaign.conversions) || 0,
            ctr: Number(campaign.ctr) || 0,
            cpc: Number(campaign.cpc) || 0,
            cpa: Number(campaign.cpa) || 0,
            cpm: campaignCpm,
            reach: campaign.reach ? Number(campaign.reach) : undefined,
            frequency: campaign.frequency ? Number(campaign.frequency) : undefined,
          },
          budget: campaign.daily_budget
            ? { type: "daily", amount: Number(campaign.daily_budget), spent: campaignSpend }
            : undefined,
          children: campaignAdGroups.map((adGroup) => {
            const groupAds = allGoogleAds.filter((ad) => ad.ad_group_id === adGroup.id);
            const adGroupStatus = getStatus(adGroup);

            const adGroupNode: TreeNode = {
              id: adGroup.id,
              type: "adset",
              level: 1,
              name: adGroup.name,
              status: adGroupStatus,
              isExpanded: false,
              platform: "google",
              facebookId: (adGroup as any).google_id,
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
                  facebookId: (ad as any).google_id,
                  parentId: adGroup.id,
                  creativeUrl: (ad as any).image_url,
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
          }),
        };
        trees.push(campaignNode);
      });
    }

    return trees;
  }, [metaCampaigns, googleCampaigns, allMetaAdSets, allMetaAds, allGoogleAdGroups, allGoogleAds, platform, includeInactive, syncingItems]);

  // Calculate total metrics across all campaigns
  const totalMetrics = useMemo((): TreeNodeMetrics => {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    campaigns.forEach((campaign) => {
      totalSpend += campaign.metrics.spend;
      totalImpressions += campaign.metrics.impressions;
      totalClicks += campaign.metrics.clicks;
      totalConversions += campaign.metrics.conversions;
    });

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr,
      cpc,
      cpa,
      cpm,
    };
  }, [campaigns]);

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
    loadingMetaCampaigns ||
    loadingGoogleCampaigns ||
    loadingMetaAdSets ||
    loadingMetaAds ||
    loadingGoogleAdGroups ||
    loadingGoogleAds;

  const refetch = () => {
    refetchMetaCampaigns();
    refetchGoogleCampaigns();
    refetchMetaAdSets();
    refetchMetaAds();
    refetchGoogleAdGroups();
    refetchGoogleAds();
  };

  // Invalidate and refetch all queries - waits for completion
  const invalidateAndRefetch = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta", clientId, companyId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-adsets", clientId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-ads", clientId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-google", clientId, companyId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-google-adgroups", clientId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-google-ads", clientId] }),
    ]);
  }, [queryClient, clientId, companyId]);

  return {
    campaigns,
    isLoading,
    totalMetrics,
    targets,
    refetch,
    invalidateAndRefetch,
  };
}
