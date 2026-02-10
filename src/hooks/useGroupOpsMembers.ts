import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsMember {
  id: string;
  group_id: string;
  company_id: string;
  wa_user_id: string | null;
  phone_e164: string | null;
  display_name: string | null;
  company_name: string | null;
  role: string | null;
  segment: string | null;
  size_bucket: string | null;
  primary_pain: string | null;
  tags: string[];
  status: string;
  last_message_at: string | null;
  last_participation_at: string | null;
  streak_days: number;
  silent_days: number;
  risk_level: string;
  privacy_flags: any;
  created_at: string;
  updated_at: string;
}

export function useGroupOpsMembers(groupId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const membersQuery = useQuery({
    queryKey: ['groupops-members', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('groupops_members')
        .select('*')
        .eq('company_id', companyId)
        .order('display_name', { ascending: true });
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GroupOpsMember[];
    },
    enabled: !!companyId,
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('groupops_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-members'] });
      toast.success('Membro atualizado');
    },
    onError: () => toast.error('Erro ao atualizar membro'),
  });

  return { members: membersQuery.data ?? [], isLoading: membersQuery.isLoading, updateMember };
}
