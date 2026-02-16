import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';

export interface MindMap {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useMindMaps() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: mindMaps = [], isLoading } = useQuery({
    queryKey: ['mind-maps', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(d => ({
        ...d,
        nodes: (d.nodes || []) as Node[],
        edges: (d.edges || []) as Edge[],
      })) as MindMap[];
    },
    enabled: !!companyId,
  });

  const createMindMap = useMutation({
    mutationFn: async (input: { title?: string; description?: string }) => {
      if (!companyId || !user) throw new Error('Sem empresa/usuário');
      const defaultNode: Node = {
        id: 'root',
        type: 'mindMapNode',
        position: { x: 400, y: 300 },
        data: { label: 'Ideia Central', level: 0 },
      };
      const { data, error } = await supabase
        .from('mind_maps')
        .insert({
          company_id: companyId,
          created_by: user.id,
          title: input.title || 'Novo Mapa Mental',
          description: input.description || null,
          nodes: [defaultNode] as any,
          edges: [] as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps'] });
      toast.success('Mapa mental criado!');
    },
    onError: () => toast.error('Erro ao criar mapa mental'),
  });

  const updateMindMap = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; title?: string; description?: string; nodes?: Node[]; edges?: Edge[] }) => {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.nodes !== undefined) updateData.nodes = input.nodes as any;
      if (input.edges !== undefined) updateData.edges = input.edges as any;

      const { data, error } = await supabase
        .from('mind_maps')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps'] });
    },
  });

  const deleteMindMap = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mind_maps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps'] });
      toast.success('Mapa mental removido!');
    },
    onError: () => toast.error('Erro ao remover mapa mental'),
  });

  return { mindMaps, isLoading, createMindMap, updateMindMap, deleteMindMap };
}
