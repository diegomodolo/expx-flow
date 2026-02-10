import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsCampaign {
  id: string;
  company_id: string;
  group_id: string;
  type: string;
  status: string;
  template_id: string | null;
  scoring_profile_id: string | null;
  schedule_rule: string | null;
  targeting_rule_json: any;
  cooldown_rule_json: any;
  delivery_mode: string | null;
  approval_required: boolean | null;
  created_at: string;
  updated_at: string;
}

export const CAMPAIGN_TYPES = [
  { value: 'DAILY_PROMPT', label: 'Provocação Diária', description: 'Pergunta ou reflexão diária para estimular discussão', icon: '💬' },
  { value: 'CHECKIN', label: 'Check-in', description: 'Acompanhamento periódico com membros', icon: '✅' },
  { value: 'CHALLENGE', label: 'Desafio 48h', description: 'Desafio com prazo para engajar membros', icon: '🏆' },
  { value: 'CASE_STUDY', label: 'Case Anônimo', description: 'Caso real para discussão coletiva', icon: '📋' },
  { value: 'RANKING', label: 'Ranking Semanal', description: 'Divulgação do ranking de pontuação', icon: '🏅' },
  { value: 'WELCOME', label: 'Boas-vindas', description: 'Mensagem para novos membros', icon: '👋' },
  { value: 'REACTIVATION', label: 'Reativação', description: 'Mensagem para membros silenciosos', icon: '🔄' },
  { value: 'CUSTOM', label: 'Personalizada', description: 'Configuração livre', icon: '⚙️' },
];

export const DELIVERY_MODES = [
  { value: 'group', label: 'No grupo' },
  { value: 'dm', label: 'DM privada' },
  { value: 'both', label: 'Grupo + DM' },
];

export function useGroupOpsCampaigns(groupId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const campaignsQuery = useQuery({
    queryKey: ['groupops-campaigns', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('groupops_campaigns')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GroupOpsCampaign[];
    },
    enabled: !!companyId,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Partial<GroupOpsCampaign>) => {
      const { id, created_at, updated_at, company_id, ...rest } = campaign;
      const { data, error } = await supabase
        .from('groupops_campaigns')
        .insert({ ...rest, company_id: companyId!, type: rest.type ?? 'CUSTOM' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-campaigns'] });
      toast.success('Campanha criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar campanha'),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('groupops_campaigns')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-campaigns'] });
      toast.success('Campanha atualizada');
    },
    onError: () => toast.error('Erro ao atualizar campanha'),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groupops_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-campaigns'] });
      toast.success('Campanha excluída');
    },
    onError: () => toast.error('Erro ao excluir campanha'),
  });

  return {
    campaigns: campaignsQuery.data ?? [],
    isLoading: campaignsQuery.isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
