import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface CampaignSendLog {
  id: string;
  company_id: string;
  campaign_id: string;
  template_id: string;
  group_id: string;
  sent_at: string;
  cycle_number: number;
  message_preview: string | null;
  delivery_status: string | null;
  metadata: any;
}

export function useGroupOpsCampaignSendLog(campaignId?: string) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const logsQuery = useQuery({
    queryKey: ['groupops-campaign-send-log', companyId, campaignId],
    queryFn: async () => {
      if (!companyId || !campaignId) return [];
      const { data, error } = await supabase
        .from('groupops_campaign_send_log' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as CampaignSendLog[];
    },
    enabled: !!companyId && !!campaignId,
  });

  return {
    logs: logsQuery.data ?? [],
    isLoading: logsQuery.isLoading,
  };
}
