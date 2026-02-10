import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsGroup {
  id: string;
  company_id: string;
  provider: string;
  provider_group_id: string | null;
  name: string;
  description: string | null;
  status: string;
  timezone: string | null;
  language: string | null;
  rules_text: string | null;
  config_json: any;
  created_at: string;
  updated_at: string;
  member_count?: number;
  messages_7d?: number;
}

export function useGroupOpsGroups() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const groupsQuery = useQuery({
    queryKey: ['groupops-groups', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_groups')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const groups = data as GroupOpsGroup[];
      if (groups.length === 0) return groups;

      const groupIds = groups.map(g => g.id);

      // Fetch member counts per group
      const { data: memberRows } = await supabase
        .from('groupops_members')
        .select('group_id')
        .eq('company_id', companyId)
        .in('group_id', groupIds);

      const memberMap = new Map<string, number>();
      memberRows?.forEach(m => {
        memberMap.set(m.group_id, (memberMap.get(m.group_id) || 0) + 1);
      });

      // Fetch message counts last 7 days per group
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: msgRows } = await supabase
        .from('groupops_messages')
        .select('group_id')
        .eq('company_id', companyId)
        .gte('timestamp', sevenDaysAgo)
        .in('group_id', groupIds);

      const msgMap = new Map<string, number>();
      msgRows?.forEach(m => {
        msgMap.set(m.group_id, (msgMap.get(m.group_id) || 0) + 1);
      });

      return groups.map(g => ({
        ...g,
        member_count: memberMap.get(g.id) || 0,
        messages_7d: msgMap.get(g.id) || 0,
      }));
    },
    enabled: !!companyId,
  });

  const createGroup = useMutation({
    mutationFn: async (group: Partial<GroupOpsGroup>) => {
      const { id, created_at, updated_at, company_id, ...rest } = group;
      const { data, error } = await supabase
        .from('groupops_groups')
        .insert({ ...rest, company_id: companyId!, name: rest.name ?? 'Novo Grupo' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-groups'] });
      toast.success('Grupo criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar grupo'),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('groupops_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-groups'] });
      toast.success('Grupo atualizado');
    },
    onError: () => toast.error('Erro ao atualizar grupo'),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('groupops_members').delete().eq('group_id', id);
      await supabase.from('groupops_events').delete().eq('group_id', id);
      await supabase.from('groupops_messages').delete().eq('group_id', id);
      const { error } = await supabase.from('groupops_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-groups'] });
      toast.success('Grupo removido com sucesso');
    },
    onError: () => toast.error('Erro ao remover grupo'),
  });

  return { groups: groupsQuery.data ?? [], isLoading: groupsQuery.isLoading, createGroup, updateGroup, deleteGroup };
}
