import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export interface OfflineConversion {
  id: string;
  client_id: string;
  offline_event_set_id: string;
  event_name: string;
  event_time: number;
  value: number | null;
  currency: string;
  status: 'pending' | 'sent' | 'error';
  meta_response: any;
  webhook_payload?: any;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  source?: 'webhook' | 'manual';
  custom_data?: any;
}

export interface SendConversionParams {
  clientId: string;
  leadId?: string;
  eventName?: string;
  eventTime?: number;
  value?: number;
  currency?: string;
  actionSource?: 'crm' | 'system_generated' | 'website' | 'app' | 'phone_call';
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    fbc?: string;
    fbp?: string;
  };
  customData?: {
    content_name?: string;
    content_type?: string;
    lead_id?: string;
    pipeline_stage?: string;
    crm_source?: string;
    disqualification_reason?: string;
    segment?: string;
    [key: string]: any;
  };
}

export const useOfflineConversions = (clientId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  // Fetch conversions for a specific client
  const {
    data: conversions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['offline-conversions', clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('offline_conversions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching offline conversions:', error);
        throw error;
      }

      return data as OfflineConversion[];
    },
    enabled: !!clientId && !!activeCompany?.company_id,
  });

  // Send a new offline conversion
  const sendConversionMutation = useMutation({
    mutationFn: async (params: SendConversionParams) => {
      console.log('Sending offline conversion:', params);

      const { data, error } = await supabase.functions.invoke('send-offline-conversion', {
        body: params,
      });

      if (error) {
        console.error('Error calling send-offline-conversion:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send offline conversion');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('Offline conversion sent successfully:', data);
      
      toast({
        title: "Conversão enviada!",
        description: "A conversão offline foi registrada no Meta com sucesso.",
      });

      // Refetch conversions list
      queryClient.invalidateQueries({ queryKey: ['offline-conversions', clientId] });
    },
    onError: (error: any) => {
      console.error('Error sending offline conversion:', error);
      
      toast({
        title: "Erro ao enviar conversão",
        description: error.message || "Não foi possível enviar a conversão offline.",
        variant: "destructive",
      });
    },
  });

  // Get timeline for specific lead
  const getLeadTimeline = async (leadId: string) => {
    const { data, error } = await supabase
      .from('offline_conversions')
      .select('*')
      .eq('client_id', clientId)
      .or(`custom_data->lead_id.eq.${leadId}`)
      .order('event_time', { ascending: true });

    if (error) {
      console.error('Error fetching lead timeline:', error);
      return [];
    }

    return data as OfflineConversion[];
  };

  return {
    conversions: conversions || [],
    isLoading,
    error,
    refetch,
    sendConversion: sendConversionMutation.mutateAsync,
    isSending: sendConversionMutation.isPending,
    getLeadTimeline,
  };
};
