import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  spend: number;
  leads: number;
  messages: number;
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
