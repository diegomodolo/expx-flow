import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Roteiro {
  id: string;
  company_id: string;
  categoria_id: string | null;
  nome: string;
  icone: string | null;
  objetivo: string | null;
  publico: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  roteiro_categorias?: { id: string; nome: string } | null;
}

export interface RoteiroInput {
  nome: string;
  categoria_id?: string | null;
  icone?: string;
  objetivo?: string;
  publico?: boolean;
}

export function useRoteiros() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: roteiros = [], isLoading } = useQuery({
    queryKey: ['roteiros', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('roteiros')
        .select('*, roteiro_categorias(id, nome)')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as Roteiro[];
    },
    enabled: !!companyId,
  });

  const createRoteiro = useMutation({
    mutationFn: async (input: RoteiroInput) => {
      if (!companyId || !user) throw new Error('Sem empresa/usuário');
      const { data, error } = await supabase
        .from('roteiros')
        .insert({ ...input, company_id: companyId, created_by: user.id })
        .select('*, roteiro_categorias(id, nome)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiros'] });
      toast.success('Roteiro criado!');
    },
    onError: () => toast.error('Erro ao criar roteiro'),
  });

  const updateRoteiro = useMutation({
    mutationFn: async ({ id, ...input }: RoteiroInput & { id: string }) => {
      const { data, error } = await supabase
        .from('roteiros')
        .update(input)
        .eq('id', id)
        .select('*, roteiro_categorias(id, nome)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiros'] });
      toast.success('Roteiro atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar roteiro'),
  });

  const deleteRoteiro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roteiros').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiros'] });
      toast.success('Roteiro removido!');
    },
    onError: () => toast.error('Erro ao remover roteiro'),
  });

  return { roteiros, isLoading, createRoteiro, updateRoteiro, deleteRoteiro };
}
