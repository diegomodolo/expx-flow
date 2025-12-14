import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  spend: number;
  leads: number;
  messages: number;
  total_conversions: number;
  cpl: number;
  leads_per_1k: number;
  impressions: number;
  clicks: number;
  page_views: number;
  cpm: number;
  cpc: number;
  ctr: number;
  connect_rate: number;
  lead_rate: number;
  frequency: number;
}

export interface TimelineDataPoint {
  date: string;
  leads: number;
  messages: number;
}

export interface TopCampaign {
  name: string;
  conversions: number;
  spend: number;
  percentage: number;
}

export interface CampaignTableRow {
  name: string;
  ad_sets_count: number;
  ads_count: number;
  spend: number;
  leads: number;
  cpl: number;
  messages: number;
  cpm: number;
  status: string;
}

export interface TopEngagementPost {
  id: string;
  thumbnail_url: string;
  caption: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  engagement: number;
}

export interface SocialMetrics {
  instagram: {
    username: string;
    profile_picture_url: string;
    followers_count: number;
    posts_count: number;
    total_likes: number;
    total_comments: number;
    avg_engagement: number;
    // Insights data (requires instagram_manage_insights permission)
    reach?: number;
    impressions?: number;
    profile_views?: number;
    website_clicks?: number;
    // Top engagement posts
    top_posts?: TopEngagementPost[];
  } | null;
  facebook: {
    page_name: string;
    page_category: string;
    followers_count?: number;
    page_reach?: number;
    page_impressions?: number;
    page_engaged_users?: number;
  } | null;
}

export interface DashboardData {
  client: {
    name: string;
    company: string;
    avatar_url?: string;
  };
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  metrics: DashboardMetrics;
  timeline: TimelineDataPoint[];
  top_campaigns: TopCampaign[];
  campaigns_table: CampaignTableRow[];
  social_metrics?: SocialMetrics;
}

export const useClientDashboard = (token: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['client-dashboard', token, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'client-dashboard-data',
        { 
          body: { token, start_date: startDate, end_date: endDate } 
        }
      );
      
      if (error) throw error;
      return data as DashboardData;
    },
    enabled: !!token && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
