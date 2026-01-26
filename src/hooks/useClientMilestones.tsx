import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ClientMilestone {
  id: string;
  clientId: string;
  companyId: string;
  milestoneType: 'onboarding' | 'first_campaign' | 'first_lead' | 'monthly_goal' | 'quarterly_goal' | 'custom';
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'celebrated';
  completedAt: string | null;
  celebratedAt: string | null;
  celebrationSent: boolean;
  celebrationMethod: 'whatsapp' | 'email' | 'both' | null;
  metricsSnapshot: Record<string, any> | null;
  milestoneOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RawMilestone {
  id: string;
  client_id: string;
  company_id: string;
  milestone_type: string;
  title: string;
  description: string | null;
  status: string;
  completed_at: string | null;
  celebrated_at: string | null;
  celebration_sent: boolean;
  celebration_method: string | null;
  metrics_snapshot: Record<string, any> | null;
  milestone_order: number;
  created_at: string;
  updated_at: string;
}

function transformMilestone(raw: RawMilestone): ClientMilestone {
  return {
    id: raw.id,
    clientId: raw.client_id,
    companyId: raw.company_id,
    milestoneType: raw.milestone_type as ClientMilestone['milestoneType'],
    title: raw.title,
    description: raw.description,
    status: raw.status as ClientMilestone['status'],
    completedAt: raw.completed_at,
    celebratedAt: raw.celebrated_at,
    celebrationSent: raw.celebration_sent,
    celebrationMethod: raw.celebration_method as ClientMilestone['celebrationMethod'],
    metricsSnapshot: raw.metrics_snapshot,
    milestoneOrder: raw.milestone_order,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useClientMilestones(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-milestones', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('client_milestones')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('milestone_order', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformMilestone);
    },
    enabled: !!activeCompany?.company_id,
  });

  const completeMilestone = useMutation({
    mutationFn: async ({ milestoneId, metricsSnapshot }: { milestoneId: string; metricsSnapshot?: Record<string, any> }) => {
      const { error } = await supabase
        .from('client_milestones')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metrics_snapshot: metricsSnapshot || null,
        })
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-milestones'] });
      toast.success('Milestone concluído!');
    },
    onError: (error) => {
      toast.error('Erro ao concluir milestone');
      console.error(error);
    },
  });

  const celebrateMilestone = useMutation({
    mutationFn: async ({ milestoneId, method }: { milestoneId: string; method: 'whatsapp' | 'email' | 'both' }) => {
      const { error } = await supabase
        .from('client_milestones')
        .update({
          status: 'celebrated',
          celebrated_at: new Date().toISOString(),
          celebration_sent: true,
          celebration_method: method,
        })
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-milestones'] });
      toast.success('Celebração enviada!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar celebração');
      console.error(error);
    },
  });

  const createMilestone = useMutation({
    mutationFn: async (milestone: Omit<ClientMilestone, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { error } = await supabase
        .from('client_milestones')
        .insert({
          client_id: milestone.clientId,
          company_id: milestone.companyId,
          milestone_type: milestone.milestoneType,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          milestone_order: milestone.milestoneOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-milestones'] });
      toast.success('Milestone criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar milestone');
      console.error(error);
    },
  });

  // Calcular progresso do onboarding
  const onboardingProgress = data
    ? Math.round(
        (data.filter(m => m.status === 'completed' || m.status === 'celebrated').length /
          Math.max(data.length, 1)) * 100
      )
    : 0;

  return {
    milestones: data || [],
    isLoading,
    error,
    refetch,
    completeMilestone,
    celebrateMilestone,
    createMilestone,
    onboardingProgress,
  };
}
