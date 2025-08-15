import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface WeeklyMetrics {
  totalSpend: number;
  totalConversions: number;
  averageCPA: number;
  averageCTR: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  averageFrequency: number;
  roas: number;
  engagements: number;
}

export interface CampaignHighlight {
  id: string;
  name: string;
  status: string;
  weeklySpend: number;
  weeklyConversions: number;
  weeklyMetrics: WeeklyMetrics;
}

export interface CreativeHighlight {
  id: string;
  name: string;
  creative_title: string;
  creative_body: string;
  image_url?: string;
  video_url?: string;
  weeklyConversions: number;
  weeklySpend: number;
  weeklyMetrics: WeeklyMetrics;
  type: 'best' | 'worst';
}

export interface WeeklyInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'action_required';
  title: string;
  description: string;
  recommendation: string;
  relatedCampaignIds?: string[];
  priority: 'high' | 'medium' | 'low';
  metric: string;
  value: string;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  campaignsByObjective: Record<string, number>;
  campaignsByStatus: Record<string, number>;
  topPerformers: CampaignHighlight[];
  averageQualityRanking: string;
  budgetUtilization: number;
}

export interface WeeklyReportData {
  clientInfo: {
    name: string;
    company: string;
    responsibleUser?: string;
    lastAccess?: string;
    briefing?: string;
  };
  currentWeekMetrics: WeeklyMetrics;
  previousWeekMetrics: WeeklyMetrics;
  campaignHighlights: CampaignHighlight[];
  campaignAnalytics: CampaignAnalytics;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function useWeeklyReport(clientId: string) {
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const generateWeeklyReport = async () => {
    if (!user || !activeCompany || !clientId) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate date ranges for current week and previous week
      const today = new Date();
      const currentWeekEnd = new Date(today);
      currentWeekEnd.setDate(today.getDate() - 1); // Yesterday
      const currentWeekStart = new Date(currentWeekEnd);
      currentWeekStart.setDate(currentWeekEnd.getDate() - 6); // 7 days ago

      const previousWeekEnd = new Date(currentWeekStart);
      previousWeekEnd.setDate(currentWeekStart.getDate() - 1);
      const previousWeekStart = new Date(previousWeekEnd);
      previousWeekStart.setDate(previousWeekEnd.getDate() - 6);

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select(`
          *,
          facebook_ad_accounts!ad_account_id (
            id,
            account_name,
            balance,
            account_status,
            has_funding_issues
          )
        `)
        .eq("id", clientId)
        .eq("company_id", activeCompany.company_id)
        .single();

      if (clientError) throw clientError;

      // Get campaigns for this client
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id);

      if (campaignsError) throw campaignsError;

      // Get ads for creative analysis
      const { data: adsData, error: adsError } = await supabase
        .from("ads")
        .select("*")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id);

      if (adsError) throw adsError;

      // Calculate current week metrics
      const currentWeekMetrics = calculateWeekMetrics(
        campaignsData || [],
        adsData || [],
        currentWeekStart,
        currentWeekEnd
      );

      // Calculate previous week metrics for comparison
      const previousWeekMetrics = calculateWeekMetrics(
        campaignsData || [],
        adsData || [],
        previousWeekStart,
        previousWeekEnd
      );

      // Get campaign highlights
      const campaignHighlights = getCampaignHighlights(
        campaignsData || [],
        currentWeekStart,
        currentWeekEnd
      );

      // Get campaign analytics
      const campaignAnalytics = getCampaignAnalytics(campaignsData || []);

      setReportData({
        clientInfo: {
          name: clientData.name,
          company: clientData.company,
          responsibleUser: user?.email || undefined,
          lastAccess: clientData.last_sync_at,
          briefing: clientData.ai_briefing || undefined,
        },
        currentWeekMetrics,
        previousWeekMetrics,
        campaignHighlights,
        campaignAnalytics,
        dateRange: {
          startDate: currentWeekStart.toISOString().split('T')[0],
          endDate: currentWeekEnd.toISOString().split('T')[0],
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar relatório semanal");
    } finally {
      setLoading(false);
    }
  };

  const calculateWeekMetrics = (
    campaigns: any[],
    ads: any[],
    startDate: Date,
    endDate: Date
  ): WeeklyMetrics => {
    // Use all active campaigns instead of filtering by date
    const activeCampaigns = campaigns.filter(campaign => 
      campaign.status === 'active' || campaign.is_active
    );

    const activeAds = ads.filter(ad => 
      ad.status === 'active' || ad.is_active
    );

    // Calculate aggregated metrics from all active campaigns
    const totalSpend = activeCampaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
    const totalConversions = activeCampaigns.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0);
    const totalImpressions = activeCampaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
    const totalClicks = activeCampaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
    const totalReach = activeCampaigns.reduce((sum, campaign) => sum + (campaign.reach || 0), 0);

    // Calculate averages
    const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageFrequency = activeCampaigns.length > 0 
      ? activeCampaigns.reduce((sum, campaign) => sum + (campaign.frequency || 0), 0) / activeCampaigns.length 
      : 0;

    // Calculate ROAS (assuming average ticket from client data)
    const roas = totalSpend > 0 ? (totalConversions * 100) / totalSpend : 0; // Simplified ROAS

    // Calculate engagements from ads data
    const engagements = activeAds.reduce((sum, ad) => 
      sum + (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0) + (ad.video_views || 0), 0
    );

    return {
      totalSpend,
      totalConversions,
      averageCPA,
      averageCTR,
      totalImpressions,
      totalClicks,
      totalReach,
      averageFrequency,
      roas,
      engagements,
    };
  };

  const getCampaignHighlights = (
    campaigns: any[],
    startDate: Date,
    endDate: Date
  ): CampaignHighlight[] => {
    // Get active campaigns with recent data
    const activeCampaigns = campaigns
      .filter(campaign => campaign.status === 'active' || campaign.is_active)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        weeklySpend: campaign.spend || 0,
        weeklyConversions: campaign.conversions || 0,
        weeklyMetrics: {
          totalSpend: campaign.spend || 0,
          totalConversions: campaign.conversions || 0,
          averageCPA: campaign.cpa || 0,
          averageCTR: campaign.ctr || 0,
          totalImpressions: campaign.impressions || 0,
          totalClicks: campaign.clicks || 0,
          totalReach: campaign.reach || 0,
          averageFrequency: campaign.frequency || 0,
          roas: 0, // Will be calculated based on conversions
          engagements: 0,
        } as WeeklyMetrics,
      }))
      .sort((a, b) => b.weeklyConversions - a.weeklyConversions)
      .slice(0, 5); // Top 5 campaigns

    return activeCampaigns;
  };

  const getCampaignAnalytics = (campaigns: any[]): CampaignAnalytics => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.is_active).length;
    const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
    
    // Group by objective
    const campaignsByObjective: Record<string, number> = {};
    campaigns.forEach(campaign => {
      const objective = campaign.objective || 'OUTCOME_LEADS';
      campaignsByObjective[objective] = (campaignsByObjective[objective] || 0) + 1;
    });

    // Group by status
    const campaignsByStatus: Record<string, number> = {};
    campaigns.forEach(campaign => {
      const status = campaign.status || 'unknown';
      campaignsByStatus[status] = (campaignsByStatus[status] || 0) + 1;
    });

    // Top performers (sorted by conversions)
    const topPerformers = campaigns
      .filter(c => c.status === 'active' || c.is_active)
      .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        weeklySpend: campaign.spend || 0,
        weeklyConversions: campaign.conversions || 0,
        weeklyMetrics: {
          totalSpend: campaign.spend || 0,
          totalConversions: campaign.conversions || 0,
          averageCPA: campaign.cpa || 0,
          averageCTR: campaign.ctr || 0,
          totalImpressions: campaign.impressions || 0,
          totalClicks: campaign.clicks || 0,
          totalReach: campaign.reach || 0,
          averageFrequency: campaign.frequency || 0,
          roas: 0,
          engagements: 0,
        } as WeeklyMetrics,
      }));

    // Calculate average quality ranking
    const qualityRankings = campaigns
      .filter(c => c.quality_ranking)
      .map(c => c.quality_ranking);
    const averageQualityRanking = qualityRankings.length > 0 
      ? qualityRankings[0] // Simplified - could be calculated properly
      : 'UNKNOWN';

    // Budget utilization (simplified)
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const budgetUtilization = totalSpend > 0 ? Math.min(totalSpend / 10000 * 100, 100) : 0; // Assuming 10k budget

    return {
      totalCampaigns,
      activeCampaigns,
      pausedCampaigns,
      campaignsByObjective,
      campaignsByStatus,
      topPerformers,
      averageQualityRanking,
      budgetUtilization,
    };
  };

  useEffect(() => {
    if (clientId) {
      generateWeeklyReport();
    }
  }, [clientId, user?.id, activeCompany?.company_id]);

  return {
    reportData,
    loading,
    error,
    regenerateReport: generateWeeklyReport,
  };
}