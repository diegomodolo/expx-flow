import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMBoard {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  order_index: number;
  created_at: string;
  created_by: string | null;
}

interface UseCRMBoardsProps {
  workspaceId: string;
}

export const useCRMBoards = ({ workspaceId }: UseCRMBoardsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['crm-boards', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_boards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as CRMBoard[];
    },
    enabled: !!workspaceId,
  });

  const createBoardMutation = useMutation({
    mutationFn: async (boardData: { name: string; description?: string }) => {
      const { data, error } = await supabase.rpc('create_default_board', {
        p_workspace_id: workspaceId,
        p_board_name: boardData.name,
      });
      
      if (error) throw error;
      return data as string; // Returns board ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-boards', workspaceId] });
      toast({
        title: "Quadro criado!",
        description: "O novo quadro foi criado com 4 colunas padrão.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar quadro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      // Verificar se é o board padrão
      const board = boards.find(b => b.id === boardId);
      if (board?.is_default) {
        throw new Error('Não é possível deletar o quadro padrão.');
      }

      // Verificar se há apenas um board
      if (boards.length <= 1) {
        throw new Error('Deve haver pelo menos um quadro no workspace.');
      }

      const { error } = await supabase
        .from('crm_boards')
        .delete()
        .eq('id', boardId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-boards', workspaceId] });
      toast({
        title: "Quadro deletado!",
        description: "O quadro foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar quadro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    boards,
    isLoading,
    createBoard: createBoardMutation.mutateAsync,
    isCreatingBoard: createBoardMutation.isPending,
    deleteBoard: deleteBoardMutation.mutateAsync,
    isDeletingBoard: deleteBoardMutation.isPending,
  };
};
