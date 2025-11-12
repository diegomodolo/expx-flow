import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export const usePerformanceSnapshots = (filters?: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  entityType?: 'campaign' | 'ad_set' | 'ad';
}) => {
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ['performance-snapshots', activeCompany?.id, filters],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      let query = supabase
        .from('performance_snapshots')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('snapshot_date', { ascending: false });

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('snapshot_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('snapshot_date', filters.endDate);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });
};
