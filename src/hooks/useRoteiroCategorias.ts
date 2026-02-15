import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RoteiroCategoria {
  id: string;
  company_id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useRoteiroCategorias() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['roteiro-categorias', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('roteiro_categorias')
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as RoteiroCategoria[];
    },
    enabled: !!companyId,
  });

  const createCategoria = useMutation({
    mutationFn: async (nome: string) => {
      if (!companyId || !user) throw new Error('Sem empresa/usuário');
      const { data, error } = await supabase
        .from('roteiro_categorias')
        .insert({ company_id: companyId, nome, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-categorias'] });
      toast.success('Categoria criada!');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roteiro_categorias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-categorias'] });
      toast.success('Categoria removida!');
    },
    onError: () => toast.error('Erro ao remover categoria'),
  });

  return { categorias, isLoading, createCategoria, deleteCategoria };
}
