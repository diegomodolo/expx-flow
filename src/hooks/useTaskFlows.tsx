import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface TaskFlow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  flow_data: any;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaskFlows() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['task-flows', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase
        .from('task_flows' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as TaskFlow[];
    },
    enabled: !!companyId,
  });

  const createFlow = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error('Missing user or company');
      const { data, error } = await (supabase
        .from('task_flows' as any)
        .insert({ company_id: companyId, name, created_by: user.id })
        .select()
        .single() as any);
      if (error) throw error;
      return data as TaskFlow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-flows'] });
      toast.success('Fluxo criado!');
    },
    onError: () => toast.error('Erro ao criar fluxo'),
  });

  const updateFlow = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskFlow> & { id: string }) => {
      const { data, error } = await (supabase
        .from('task_flows' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);
      if (error) throw error;
      return data as TaskFlow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-flows'] });
    },
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('task_flows' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-flows'] });
      toast.success('Fluxo excluído!');
    },
    onError: () => toast.error('Erro ao excluir fluxo'),
  });

  return {
    flows,
    isLoading,
    createFlow: createFlow.mutateAsync,
    updateFlow: updateFlow.mutate,
    updateFlowAsync: updateFlow.mutateAsync,
    deleteFlow: deleteFlow.mutate,
    isCreating: createFlow.isPending,
  };
}
