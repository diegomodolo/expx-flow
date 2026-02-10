import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsScoringProfile {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  rules_json: any;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface GroupOpsBadge {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rule_json: any;
  created_at: string;
}

export interface GroupOpsScoreLedgerEntry {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  points: number;
  reason: string;
  event_id: string | null;
  timestamp: string;
}

export const DEFAULT_SCORING_RULES = {
  message: 0,
  checkin: 2,
  challenge_done: 6,
  case: 5,
  useful_reply: 3,
  streak_bonus: 4,
  spam: -5,
  warning: -3,
};

export function useGroupOpsScoring() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const profilesQuery = useQuery({
    queryKey: ['groupops-scoring-profiles', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_scoring_profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GroupOpsScoringProfile[];
    },
    enabled: !!companyId,
  });

  const badgesQuery = useQuery({
    queryKey: ['groupops-badges', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_badges')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GroupOpsBadge[];
    },
    enabled: !!companyId,
  });

  const ledgerQuery = useQuery({
    queryKey: ['groupops-score-ledger', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_score_ledger')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as GroupOpsScoreLedgerEntry[];
    },
    enabled: !!companyId,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: Partial<GroupOpsScoringProfile>) => {
      const { id, created_at, updated_at, company_id, ...rest } = profile;
      const { data, error } = await supabase
        .from('groupops_scoring_profiles')
        .insert({ ...rest, company_id: companyId!, name: rest.name ?? 'Novo Perfil', rules_json: rest.rules_json ?? DEFAULT_SCORING_RULES } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-scoring-profiles'] }); toast.success('Perfil criado'); },
    onError: () => toast.error('Erro ao criar perfil'),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsScoringProfile> & { id: string }) => {
      const { data, error } = await supabase.from('groupops_scoring_profiles').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-scoring-profiles'] }); toast.success('Perfil atualizado'); },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groupops_scoring_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-scoring-profiles'] }); toast.success('Perfil excluído'); },
    onError: () => toast.error('Erro ao excluir perfil'),
  });

  const createBadge = useMutation({
    mutationFn: async (badge: Partial<GroupOpsBadge>) => {
      const { id, created_at, company_id, ...rest } = badge;
      const { data, error } = await supabase
        .from('groupops_badges')
        .insert({ ...rest, company_id: companyId!, name: rest.name ?? 'Novo Badge' } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-badges'] }); toast.success('Badge criado'); },
    onError: () => toast.error('Erro ao criar badge'),
  });

  const updateBadge = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsBadge> & { id: string }) => {
      const { data, error } = await supabase.from('groupops_badges').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-badges'] }); toast.success('Badge atualizado'); },
    onError: () => toast.error('Erro ao atualizar badge'),
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groupops_badges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-badges'] }); toast.success('Badge excluído'); },
    onError: () => toast.error('Erro ao excluir badge'),
  });

  return {
    profiles: profilesQuery.data ?? [],
    badges: badgesQuery.data ?? [],
    ledger: ledgerQuery.data ?? [],
    isLoading: profilesQuery.isLoading || badgesQuery.isLoading,
    createProfile, updateProfile, deleteProfile,
    createBadge, updateBadge, deleteBadge,
  };
}
