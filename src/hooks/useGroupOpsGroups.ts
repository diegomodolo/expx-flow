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
      return data as GroupOpsGroup[];
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

  return { groups: groupsQuery.data ?? [], isLoading: groupsQuery.isLoading, createGroup, updateGroup };
}
