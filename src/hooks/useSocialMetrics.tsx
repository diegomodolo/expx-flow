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
        console.log('No dashboard token found for client:', clientId);
        return { social_metrics: null };
      }

      // Calculate date range (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('Fetching social metrics with dates:', { startDate, endDate, token: client.dashboard_token.substring(0, 8) + '...' });

      // Fetch dashboard data which includes social metrics
      const { data, error } = await supabase.functions.invoke('client-dashboard-data', {
        body: { 
          token: client.dashboard_token, 
          start_date: startDate, 
          end_date: endDate 
        }
      });

      if (error) {
        console.error('Error fetching social metrics:', error);
        throw error;
      }

      console.log('Social metrics received:', data?.social_metrics ? 'yes' : 'no');

      return {
        social_metrics: data?.social_metrics || null
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
