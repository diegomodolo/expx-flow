import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { KanbanTemplate, TaskStatus } from "@/data/kanbanTemplates";

export interface TaskBoardColumn {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  status: TaskStatus;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface CreateColumnData {
  name: string;
  status: TaskStatus;
  color: string;
}

interface UpdateColumnData {
  name?: string;
  color?: string;
  order_index?: number;
}

export function useTaskBoardColumns(targetUserId?: string | null) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['task-board-columns', companyId, targetUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return [];

      const userId = targetUserId || user.id;

      const { data, error } = await (supabase
        .from('task_board_columns' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('order_index', { ascending: true }) as any);

      if (error) {
        console.error('Error fetching task board columns:', error);
        throw error;
      }

      return (data || []) as TaskBoardColumn[];
    },
    enabled: !!companyId,
  });

  const createColumnMutation = useMutation({
    mutationFn: async (columnData: CreateColumnData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error('User or company not found');

      // Get the max order_index for the current user
      const maxOrderIndex = columns.length > 0 
        ? Math.max(...columns.map(c => c.order_index)) 
        : -1;

      const { data, error } = await (supabase
        .from('task_board_columns' as any)
        .insert({
          user_id: user.id,
          company_id: companyId,
          name: columnData.name,
          status: columnData.status,
          color: columnData.color,
          order_index: maxOrderIndex + 1,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board-columns'] });
      toast.success('Coluna criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating column:', error);
      toast.error('Erro ao criar coluna');
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnId, updates }: { columnId: string; updates: UpdateColumnData }) => {
      const { data, error } = await (supabase
        .from('task_board_columns' as any)
        .update(updates)
        .eq('id', columnId)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board-columns'] });
      toast.success('Coluna atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating column:', error);
      toast.error('Erro ao atualizar coluna');
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await (supabase
        .from('task_board_columns' as any)
        .delete()
        .eq('id', columnId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board-columns'] });
      toast.success('Coluna excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting column:', error);
      toast.error('Erro ao excluir coluna');
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (orderedColumnIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Update each column with its new order_index
      const updates = orderedColumnIds.map((columnId, index) => 
        (supabase
          .from('task_board_columns' as any)
          .update({ order_index: index })
          .eq('id', columnId) as any)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board-columns'] });
    },
    onError: (error) => {
      console.error('Error reordering columns:', error);
      toast.error('Erro ao reordenar colunas');
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (template: KanbanTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error('User or company not found');

      // 1. Delete all existing columns for this user/company
      const { error: deleteError } = await (supabase
        .from('task_board_columns' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('company_id', companyId) as any);

      if (deleteError) throw deleteError;

      // 2. Insert new columns from template
      const columnsToInsert = template.columns.map((col, index) => ({
        user_id: user.id,
        company_id: companyId,
        name: col.name,
        status: col.status,
        color: col.color,
        order_index: index,
      }));

      const { error: insertError } = await (supabase
        .from('task_board_columns' as any)
        .insert(columnsToInsert) as any);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board-columns'] });
      toast.success('Template aplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Error applying template:', error);
      toast.error('Erro ao aplicar template');
    },
  });

  return {
    columns,
    isLoading,
    createColumn: createColumnMutation.mutate,
    updateColumn: updateColumnMutation.mutate,
    deleteColumn: deleteColumnMutation.mutate,
    reorderColumns: reorderColumnsMutation.mutate,
    applyTemplate: applyTemplateMutation.mutate,
    isCreating: createColumnMutation.isPending,
    isUpdating: updateColumnMutation.isPending,
    isDeleting: deleteColumnMutation.isPending,
    isApplyingTemplate: applyTemplateMutation.isPending,
  };
}
