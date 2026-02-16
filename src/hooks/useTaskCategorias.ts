import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TaskCategoria {
  id: string;
  company_id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
}

export interface TaskClassificacao {
  id: string;
  company_id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
}

export function useTaskCategorias() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: categorias = [], isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['task-categorias', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('task_categorias' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as unknown as TaskCategoria[];
    },
    enabled: !!companyId,
  });

  const createCategoria = useMutation({
    mutationFn: async (nome: string) => {
      if (!companyId || !user) throw new Error('Sem empresa/usuário');
      const { data, error } = await supabase
        .from('task_categorias' as any)
        .insert({ company_id: companyId, nome, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categorias'] });
      toast.success('Categoria criada!');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  const { data: classificacoes = [], isLoading: isLoadingClassificacoes } = useQuery({
    queryKey: ['task-classificacoes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('task_classificacoes' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as unknown as TaskClassificacao[];
    },
    enabled: !!companyId,
  });

  const createClassificacao = useMutation({
    mutationFn: async (nome: string) => {
      if (!companyId || !user) throw new Error('Sem empresa/usuário');
      const { data, error } = await supabase
        .from('task_classificacoes' as any)
        .insert({ company_id: companyId, nome, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskClassificacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-classificacoes'] });
      toast.success('Classificação criada!');
    },
    onError: () => toast.error('Erro ao criar classificação'),
  });

  return {
    categorias,
    isLoadingCategorias,
    createCategoria,
    classificacoes,
    isLoadingClassificacoes,
    createClassificacao,
  };
}
