import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SocialMetrics } from "@/hooks/useClientDashboard";

interface SocialMetricsData {
  social_metrics: SocialMetrics | null;
}

export function useSocialMetrics(clientId: string) {
  return useQuery({
    queryKey: ['social-metrics', clientId],
    queryFn: async (): Promise<SocialMetricsData> => {
      // Get client's dashboard token
      const { data: client } = await supabase
        .from('clients')
        .select('dashboard_token')
        .eq('id', clientId)
        .single();

      if (!client?.dashboard_token) {
        return { social_metrics: null };
      }

      // Calculate date range (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch dashboard data which includes social metrics
      const { data, error } = await supabase.functions.invoke('client-dashboard-data', {
        body: { token: client.dashboard_token, startDate, endDate }
      });

      if (error) throw error;

      return {
        social_metrics: data?.social_metrics || null
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
