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
  template_mode: string;
  selected_template_ids: string[] | null;
  scoring_profile_id: string | null;
  schedule_rule: string | null;
  schedule_frequency: string | null;
  schedule_times: string[] | null;
  schedule_days_of_week: number[] | null;
  schedule_day_of_month: number | null;
  next_execution_at: string | null;
  last_execution_at: string | null;
  instance_id: string | null;
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

export const SCHEDULE_FREQUENCIES = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

// Calculate next execution time based on schedule config (São Paulo timezone)
function calculateNextExecution(
  frequency: string,
  times: string[],
  daysOfWeek: number[] | null,
  dayOfMonth: number | null
): string | null {
  if (!times || times.length === 0) return null;
  
  const now = new Date();
  // São Paulo is UTC-3
  const spOffset = -3 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const sp = new Date(utcMs + spOffset * 60000);
  const currentHHMM = `${String(sp.getHours()).padStart(2, '0')}:${String(sp.getMinutes()).padStart(2, '0')}`;
  const currentDay = sp.getDay();
  const currentDate = sp.getDate();
  const sortedTimes = [...times].sort();

  const toUTC = (d: Date) => new Date(d.getTime() + 3 * 3600000).toISOString();

  if (frequency === 'daily') {
    const nextTimeToday = sortedTimes.find(t => t > currentHHMM);
    const next = new Date(sp);
    if (nextTimeToday) {
      const [h, m] = nextTimeToday.split(':').map(Number);
      next.setHours(h, m, 0, 0);
    } else {
      const [h, m] = sortedTimes[0].split(':').map(Number);
      next.setDate(next.getDate() + 1);
      next.setHours(h, m, 0, 0);
    }
    return toUTC(next);
  }

  if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    const sortedDays = [...daysOfWeek].sort();
    if (sortedDays.includes(currentDay)) {
      const nextTimeToday = sortedTimes.find(t => t > currentHHMM);
      if (nextTimeToday) {
        const [h, m] = nextTimeToday.split(':').map(Number);
        const next = new Date(sp);
        next.setHours(h, m, 0, 0);
        return toUTC(next);
      }
    }
    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = (currentDay + offset) % 7;
      if (sortedDays.includes(checkDay)) {
        const [h, m] = sortedTimes[0].split(':').map(Number);
        const next = new Date(sp);
        next.setDate(next.getDate() + offset);
        next.setHours(h, m, 0, 0);
        return toUTC(next);
      }
    }
  }

  if (frequency === 'monthly' && dayOfMonth) {
    const next = new Date(sp);
    if (currentDate === dayOfMonth) {
      const nextTimeToday = sortedTimes.find(t => t > currentHHMM);
      if (nextTimeToday) {
        const [h, m] = nextTimeToday.split(':').map(Number);
        next.setHours(h, m, 0, 0);
        return toUTC(next);
      }
    }
    if (currentDate >= dayOfMonth) {
      next.setMonth(next.getMonth() + 1);
    }
    const [h, m] = sortedTimes[0].split(':').map(Number);
    next.setDate(dayOfMonth);
    next.setHours(h, m, 0, 0);
    return toUTC(next);
  }

  return null;
}

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
      const { id, created_at, updated_at, company_id, next_execution_at, last_execution_at, ...rest } = campaign;
      // Auto-calculate next_execution_at
      const nextExec = rest.status === 'active'
        ? calculateNextExecution(
            rest.schedule_frequency || 'daily',
            rest.schedule_times || ['09:00'],
            rest.schedule_days_of_week || null,
            rest.schedule_day_of_month || null
          )
        : null;
      const { data, error } = await supabase
        .from('groupops_campaigns')
        .insert({ ...rest, company_id: companyId!, type: rest.type ?? 'CUSTOM', next_execution_at: nextExec } as any)
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
      // Recalculate next_execution_at if scheduling fields changed
      const shouldCalcNext = updates.schedule_frequency || updates.schedule_times || updates.status;
      if (shouldCalcNext) {
        const nextExec = (updates.status ?? 'active') === 'active'
          ? calculateNextExecution(
              updates.schedule_frequency || 'daily',
              updates.schedule_times || ['09:00'],
              updates.schedule_days_of_week || null,
              updates.schedule_day_of_month || null
            )
          : null;
        (updates as any).next_execution_at = nextExec;
      }
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
