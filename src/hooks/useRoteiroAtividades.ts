import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoteiroAtividade {
  id: string;
  roteiro_id: string;
  titulo: string;
  tipo: string | null;
  inicio_apos_dias: number | null;
  duracao_dias: number | null;
  responsavel_id: string | null;
  quadro_column_id: string | null;
  etapa: string | null;
  fluxo: string | null;
  tags: any;
  descricao: string | null;
  autorizador_id: string | null;
  checklist: any;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface AtividadeInput {
  titulo: string;
  tipo?: string | null;
  inicio_apos_dias?: number;
  duracao_dias?: number;
  responsavel_id?: string | null;
  quadro_column_id?: string | null;
  etapa?: string | null;
  fluxo?: string | null;
  tags?: any;
  descricao?: string | null;
  autorizador_id?: string | null;
  checklist?: any;
  ordem?: number;
}

export function useRoteiroAtividades(roteiroId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['roteiro-atividades', roteiroId],
    queryFn: async () => {
      if (!roteiroId) return [];
      const { data, error } = await supabase
        .from('roteiro_atividades')
        .select('*')
        .eq('roteiro_id', roteiroId)
        .order('ordem');
      if (error) throw error;
      return data as RoteiroAtividade[];
    },
    enabled: !!roteiroId,
  });

  const createAtividade = useMutation({
    mutationFn: async (input: AtividadeInput) => {
      if (!roteiroId) throw new Error('Sem roteiro');
      const maxOrdem = atividades.length > 0 ? Math.max(...atividades.map(a => a.ordem)) + 1 : 0;
      const { data, error } = await supabase
        .from('roteiro_atividades')
        .insert({ ...input, roteiro_id: roteiroId, ordem: input.ordem ?? maxOrdem })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-atividades', roteiroId] });
      toast.success('Atividade criada!');
    },
    onError: () => toast.error('Erro ao criar atividade'),
  });

  const updateAtividade = useMutation({
    mutationFn: async ({ id, ...input }: AtividadeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('roteiro_atividades')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-atividades', roteiroId] });
      toast.success('Atividade atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar atividade'),
  });

  const deleteAtividade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roteiro_atividades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-atividades', roteiroId] });
      toast.success('Atividade removida!');
    },
    onError: () => toast.error('Erro ao remover atividade'),
  });

  const reorderAtividades = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('roteiro_atividades').update({ ordem: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro-atividades', roteiroId] });
    },
  });

  return { atividades, isLoading, createAtividade, updateAtividade, deleteAtividade, reorderAtividades };
}
