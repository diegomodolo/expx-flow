import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface NPSResponse {
  id: string;
  clientId: string;
  companyId: string;
  score: number;
  feedback: string | null;
  triggerType: 'monthly' | 'campaign_delivery' | 'qbr';
  respondedAt: string;
  contactName: string | null;
  contactEmail: string | null;
  followUpDone: boolean;
  followUpNotes: string | null;
  createdAt: string;
  clients?: {
    name: string;
    company: string;
  };
}

interface RawNPSResponse {
  id: string;
  client_id: string;
  company_id: string;
  score: number;
  feedback: string | null;
  trigger_type: string;
  responded_at: string;
  contact_name: string | null;
  contact_email: string | null;
  follow_up_done: boolean;
  follow_up_notes: string | null;
  created_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

function transformNPSResponse(raw: RawNPSResponse): NPSResponse {
  return {
    id: raw.id,
    clientId: raw.client_id,
    companyId: raw.company_id,
    score: raw.score,
    feedback: raw.feedback,
    triggerType: raw.trigger_type as NPSResponse['triggerType'],
    respondedAt: raw.responded_at,
    contactName: raw.contact_name,
    contactEmail: raw.contact_email,
    followUpDone: raw.follow_up_done,
    followUpNotes: raw.follow_up_notes,
    createdAt: raw.created_at,
    clients: raw.clients,
  };
}

export function useNPSResponses(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['nps-responses', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('client_nps_responses')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('responded_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformNPSResponse);
    },
    enabled: !!activeCompany?.company_id,
  });

  const createNPSResponse = useMutation({
    mutationFn: async (nps: {
      clientId: string;
      score: number;
      feedback?: string;
      triggerType?: 'monthly' | 'campaign_delivery' | 'qbr';
      contactName?: string;
      contactEmail?: string;
    }) => {
      if (!activeCompany?.company_id) throw new Error('No company selected');

      const { error } = await supabase
        .from('client_nps_responses')
        .insert({
          client_id: nps.clientId,
          company_id: activeCompany.company_id,
          score: nps.score,
          feedback: nps.feedback || null,
          trigger_type: nps.triggerType || 'monthly',
          responded_at: new Date().toISOString(),
          contact_name: nps.contactName || null,
          contact_email: nps.contactEmail || null,
        });

      if (error) throw error;

      // Update NPS on client health config
      await supabase
        .from('client_health_config')
        .update({ 
          nps_score: nps.score,
          nps_collected_at: new Date().toISOString(),
        })
        .eq('client_id', nps.clientId)
        .eq('company_id', activeCompany.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nps-responses'] });
      queryClient.invalidateQueries({ queryKey: ['cs-health-score-360'] });
      toast.success('Resposta NPS registrada!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar NPS');
      console.error(error);
    },
  });

  const markFollowUpDone = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('client_nps_responses')
        .update({
          follow_up_done: true,
          follow_up_notes: notes || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nps-responses'] });
      toast.success('Follow-up marcado como feito!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar follow-up');
      console.error(error);
    },
  });

  // Calculate NPS metrics
  const responses = data || [];
  const promoters = responses.filter(r => r.score >= 9).length;
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const total = responses.length;
  
  const npsScore = total > 0 
    ? Math.round(((promoters - detractors) / total) * 100)
    : null;

  const pendingFollowUps = responses.filter(r => r.score <= 6 && !r.followUpDone);

  return {
    responses,
    promoters,
    passives,
    detractors,
    npsScore,
    pendingFollowUps,
    isLoading,
    error,
    refetch,
    createNPSResponse,
    markFollowUpDone,
  };
}
