import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ClientTouchpoint {
  id: string;
  clientId: string;
  companyId: string;
  touchpointType: 'call' | 'meeting' | 'qbr' | 'email' | 'whatsapp';
  occurredAt: string;
  summary: string | null;
  aiSummary: string | null;
  participants: string[];
  nextAction: string | null;
  nextActionDate: string | null;
  createdBy: string | null;
  createdAt: string;
  clients?: {
    name: string;
    company: string;
  };
}

interface RawTouchpoint {
  id: string;
  client_id: string;
  company_id: string;
  touchpoint_type: string;
  occurred_at: string;
  summary: string | null;
  ai_summary: string | null;
  participants: string[];
  next_action: string | null;
  next_action_date: string | null;
  created_by: string | null;
  created_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

function transformTouchpoint(raw: RawTouchpoint): ClientTouchpoint {
  return {
    id: raw.id,
    clientId: raw.client_id,
    companyId: raw.company_id,
    touchpointType: raw.touchpoint_type as ClientTouchpoint['touchpointType'],
    occurredAt: raw.occurred_at,
    summary: raw.summary,
    aiSummary: raw.ai_summary,
    participants: raw.participants || [],
    nextAction: raw.next_action,
    nextActionDate: raw.next_action_date,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    clients: raw.clients,
  };
}

export function useClientTouchpoints(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-touchpoints', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('client_touchpoints')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('occurred_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformTouchpoint);
    },
    enabled: !!activeCompany?.company_id,
  });

  const createTouchpoint = useMutation({
    mutationFn: async (touchpoint: {
      clientId: string;
      touchpointType: ClientTouchpoint['touchpointType'];
      summary: string;
      occurredAt?: string;
      nextAction?: string;
      nextActionDate?: string;
    }) => {
      if (!activeCompany?.company_id) throw new Error('No company selected');

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('client_touchpoints')
        .insert({
          client_id: touchpoint.clientId,
          company_id: activeCompany.company_id,
          touchpoint_type: touchpoint.touchpointType,
          summary: touchpoint.summary,
          occurred_at: touchpoint.occurredAt || new Date().toISOString(),
          next_action: touchpoint.nextAction || null,
          next_action_date: touchpoint.nextActionDate || null,
          created_by: user?.id || null,
          participants: user?.id ? [user.id] : [],
        });

      if (error) throw error;

      // Update last CS contact on client health config
      await supabase
        .from('client_health_config')
        .update({ last_cs_contact_at: new Date().toISOString() })
        .eq('client_id', touchpoint.clientId)
        .eq('company_id', activeCompany.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-touchpoints'] });
      queryClient.invalidateQueries({ queryKey: ['cs-health-score-360'] });
      toast.success('Touchpoint registrado!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar touchpoint');
      console.error(error);
    },
  });

  const recentTouchpoints = data?.slice(0, 10) || [];
  const overdueFollowups = data?.filter(t => {
    if (!t.nextActionDate) return false;
    return new Date(t.nextActionDate) < new Date();
  }) || [];

  return {
    touchpoints: data || [],
    recentTouchpoints,
    overdueFollowups,
    isLoading,
    error,
    refetch,
    createTouchpoint,
  };
}
