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
  creativeHighlights: CreativeHighlight[];
  insights: WeeklyInsight[];
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

      // Get creative highlights (best and worst performers)
      const creativeHighlights = getCreativeHighlights(
        adsData || [],
        currentWeekStart,
        currentWeekEnd
      );

      // Generate AI insights
      const insights = await generateInsights(
        clientData,
        campaignsData || [],
        currentWeekMetrics,
        previousWeekMetrics
      );

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
        creativeHighlights,
        insights,
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
    // Filter campaigns and ads updated within the date range
    const weekCampaigns = campaigns.filter(campaign => {
      const updatedAt = new Date(campaign.updated_at);
      return updatedAt >= startDate && updatedAt <= endDate;
    });

    const weekAds = ads.filter(ad => {
      const updatedAt = new Date(ad.updated_at);
      return updatedAt >= startDate && updatedAt <= endDate;
    });

    // Calculate aggregated metrics
    const totalSpend = weekCampaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
    const totalConversions = weekCampaigns.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0);
    const totalImpressions = weekCampaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
    const totalClicks = weekCampaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
    const totalReach = weekCampaigns.reduce((sum, campaign) => sum + (campaign.reach || 0), 0);

    // Calculate averages
    const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageFrequency = weekCampaigns.length > 0 
      ? weekCampaigns.reduce((sum, campaign) => sum + (campaign.frequency || 0), 0) / weekCampaigns.length 
      : 0;

    // Calculate ROAS (assuming average ticket from client data)
    const roas = totalSpend > 0 ? (totalConversions * 100) / totalSpend : 0; // Simplified ROAS

    // Calculate engagements from ads data
    const engagements = weekAds.reduce((sum, ad) => 
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

  const getCreativeHighlights = (
    ads: any[],
    startDate: Date,
    endDate: Date
  ): CreativeHighlight[] => {
    const adsWithMetrics = ads
      .filter(ad => ad.conversions > 0 || ad.spend > 0)
      .map(ad => ({
        id: ad.id,
        name: ad.name,
        creative_title: ad.creative_title || '',
        creative_body: ad.creative_body || '',
        image_url: ad.image_url,
        video_url: ad.video_url,
        weeklyConversions: ad.conversions || 0,
        weeklySpend: ad.spend || 0,
        weeklyMetrics: {
          totalSpend: ad.spend || 0,
          totalConversions: ad.conversions || 0,
          averageCPA: ad.cpa || 0,
          averageCTR: ad.ctr || 0,
          totalImpressions: ad.impressions || 0,
          totalClicks: ad.clicks || 0,
          totalReach: ad.reach || 0,
          averageFrequency: ad.frequency || 0,
          roas: 0,
          engagements: (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0),
        } as WeeklyMetrics,
        type: 'best' as const,
      }))
      .sort((a, b) => b.weeklyConversions - a.weeklyConversions);

    const highlights: CreativeHighlight[] = [];

    // Best performer
    if (adsWithMetrics.length > 0) {
      highlights.push({ ...adsWithMetrics[0], type: 'best' });
    }

    // Worst performer (if there are at least 2 ads)
    if (adsWithMetrics.length > 1) {
      highlights.push({ 
        ...adsWithMetrics[adsWithMetrics.length - 1], 
        type: 'worst' 
      });
    }

    return highlights;
  };

  const generateInsights = async (
    client: any,
    campaigns: any[],
    currentWeek: WeeklyMetrics,
    previousWeek: WeeklyMetrics
  ): Promise<WeeklyInsight[]> => {
    const insights: WeeklyInsight[] = [];

    // Performance comparison insights
    const cpaChange = previousWeek.averageCPA > 0 
      ? ((currentWeek.averageCPA - previousWeek.averageCPA) / previousWeek.averageCPA) * 100 
      : 0;

    const conversionsChange = previousWeek.totalConversions > 0
      ? ((currentWeek.totalConversions - previousWeek.totalConversions) / previousWeek.totalConversions) * 100
      : 0;

    // CPA Analysis
    if (currentWeek.averageCPA > 120) {
      insights.push({
        id: 'high-cpa',
        type: 'warning',
        title: 'CPA Elevado Detectado',
        description: `O CPA atual de R$ ${currentWeek.averageCPA.toFixed(2)} está acima da meta de R$ 120.`,
        recommendation: 'Revise a segmentação das campanhas e otimize os criativos para melhorar a performance.',
        priority: 'high',
        metric: 'CPA',
        value: `R$ ${currentWeek.averageCPA.toFixed(2)}`,
      });
    }

    if (cpaChange > 20) {
      insights.push({
        id: 'cpa-increase',
        type: 'warning',
        title: 'Aumento Significativo no CPA',
        description: `O CPA aumentou ${cpaChange.toFixed(1)}% em relação à semana anterior.`,
        recommendation: 'Analise as mudanças recentes nas campanhas e reverta alterações que possam ter causado o aumento.',
        priority: 'high',
        metric: 'CPA Change',
        value: `+${cpaChange.toFixed(1)}%`,
      });
    }

    // Conversions Analysis
    if (currentWeek.totalConversions === 0 && currentWeek.totalSpend > 0) {
      insights.push({
        id: 'no-conversions',
        type: 'action_required',
        title: 'Nenhuma Conversão Registrada',
        description: 'Campanhas ativas não estão gerando conversões apesar do investimento.',
        recommendation: 'Verifique o pixel de conversão, revise a landing page e analise a segmentação.',
        priority: 'high',
        metric: 'Conversões',
        value: '0',
      });
    }

    if (conversionsChange < -30) {
      insights.push({
        id: 'conversions-drop',
        type: 'warning',
        title: 'Queda nas Conversões',
        description: `As conversões diminuíram ${Math.abs(conversionsChange).toFixed(1)}% em relação à semana anterior.`,
        recommendation: 'Investigue mudanças recentes nas campanhas e no mercado que possam ter afetado a performance.',
        priority: 'high',
        metric: 'Conversões Change',
        value: `${conversionsChange.toFixed(1)}%`,
      });
    }

    // Opportunity insights
    if (currentWeek.averageCPA < 80 && currentWeek.totalConversions >= 10) {
      insights.push({
        id: 'scale-opportunity',
        type: 'opportunity',
        title: 'Oportunidade de Escalonamento',
        description: `CPA baixo (R$ ${currentWeek.averageCPA.toFixed(2)}) e bom volume de conversões indicam potencial para escalar.`,
        recommendation: 'Considere aumentar o orçamento em 20-30% para capturar mais volume mantendo a eficiência.',
        priority: 'medium',
        metric: 'CPA',
        value: `R$ ${currentWeek.averageCPA.toFixed(2)}`,
      });
    }

    // CTR Analysis
    if (currentWeek.averageCTR < 1.0 && currentWeek.totalImpressions > 1000) {
      insights.push({
        id: 'low-ctr',
        type: 'action_required',
        title: 'CTR Abaixo da Meta',
        description: `CTR de ${currentWeek.averageCTR.toFixed(2)}% está abaixo do ideal (>1.0%).`,
        recommendation: 'Teste novos criativos e copies para melhorar o engajamento da audiência.',
        priority: 'medium',
        metric: 'CTR',
        value: `${currentWeek.averageCTR.toFixed(2)}%`,
      });
    }

    return insights.slice(0, 6); // Limit to 6 insights
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