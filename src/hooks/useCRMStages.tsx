import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CRMStage } from "./useCRMDeals";

interface UseCRMStagesProps {
  workspaceId: string;
  boardId: string;
}

export const useCRMStages = ({ workspaceId, boardId }: UseCRMStagesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStageMutation = useMutation({
    mutationFn: async ({ 
      stageId, 
      updates 
    }: { 
      stageId: string; 
      updates: Partial<CRMStage> 
    }) => {
      const { data, error } = await supabase
        .from('crm_stages')
        .update(updates)
        .eq('id', stageId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stages', workspaceId, boardId] });
      toast({
        title: "Coluna atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar coluna",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: async (stages: CRMStage[]) => {
      console.log('[useCRMStages] Reordering stages:', stages);
      
      // Estratégia: primeiro colocar todos em valores temporários negativos
      // para evitar conflito com a constraint unique, depois atualizar para os valores finais
      
      // Passo 1: Atualizar para valores temporários negativos
      for (let i = 0; i < stages.length; i++) {
        const { error } = await supabase
          .from('crm_stages')
          .update({ order_index: -(i + 1) })
          .eq('id', stages[i].id);
        
        if (error) {
          console.error('[useCRMStages] Error in temp update:', error);
          throw new Error(`Falha ao reordenar colunas: ${error.message}`);
        }
      }
      
      // Passo 2: Atualizar para valores finais corretos
      for (let i = 0; i < stages.length; i++) {
        const { error } = await supabase
          .from('crm_stages')
          .update({ order_index: i + 1 })
          .eq('id', stages[i].id);
        
        if (error) {
          console.error('[useCRMStages] Error in final update:', error);
          throw new Error(`Falha ao reordenar colunas: ${error.message}`);
        }
      }
      
      console.log('[useCRMStages] All stages reordered successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stages', workspaceId, boardId] });
      toast({
        title: "Ordem atualizada!",
        description: "As colunas foram reorganizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reordenar colunas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async (stageData: Partial<CRMStage> & { color?: string }) => {
      // Buscar o maior order_index atual para este board
      const { data: maxOrderStage } = await supabase
        .from('crm_stages')
        .select('order_index')
        .eq('workspace_id', workspaceId)
        .eq('board_id', boardId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrderIndex = (maxOrderStage?.order_index || 0) + 1;

      const { data, error } = await supabase
        .from('crm_stages')
        .insert({
          workspace_id: workspaceId,
          board_id: boardId,
          name: stageData.name!,
          color: stageData.color || '#3b82f6',
          event_mapping: stageData.event_mapping || null,
          order_index: nextOrderIndex,
          auto_status_change: stageData.auto_status_change || false,
          target_status: stageData.target_status || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stages', workspaceId, boardId] });
      toast({
        title: "Coluna criada!",
        description: "A nova coluna foi adicionada ao quadro.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar coluna",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      // Verificar se há leads nesta stage
      const { data: leadsInStage, error: countError } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', stageId);

      if (countError) throw countError;

      if (leadsInStage && leadsInStage.length > 0) {
        throw new Error('Não é possível deletar uma coluna com leads. Mova os leads primeiro.');
      }

      // Verificar se há pelo menos 2 stages no workspace
      const { data: stagesCount, error: stagesError } = await supabase
        .from('crm_stages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (stagesError) throw stagesError;

      if (stagesCount && stagesCount.length <= 1) {
        throw new Error('Deve haver pelo menos uma coluna no workspace.');
      }

      const { error } = await supabase
        .from('crm_stages')
        .delete()
        .eq('id', stageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stages', workspaceId, boardId] });
      toast({
        title: "Coluna deletada!",
        description: "A coluna foi removida do quadro.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar coluna",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateStage: updateStageMutation.mutateAsync,
    isUpdatingStage: updateStageMutation.isPending,
    
    reorderStages: reorderStagesMutation.mutateAsync,
    isReorderingStages: reorderStagesMutation.isPending,
    
    createStage: createStageMutation.mutateAsync,
    isCreatingStage: createStageMutation.isPending,
    
    deleteStage: deleteStageMutation.mutateAsync,
    isDeletingStage: deleteStageMutation.isPending,
  };
};
