import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceFolder } from "@/types/workspace";

export function useWorkspaceFolders() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: ['workspace-folders', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('workspace_folders')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('name');
      
      if (error) throw error;
      return data as WorkspaceFolder[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId, icon }: { name: string; parentId?: string | null; icon?: string }) => {
      if (!activeCompany?.company_id || !user?.id) throw new Error('Missing company or user');
      
      const { data, error } = await supabase
        .from('workspace_folders')
        .insert({
          company_id: activeCompany.company_id,
          parent_id: parentId || null,
          name,
          icon: icon || '📁',
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-folders'] });
      toast({ title: 'Pasta criada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar pasta', description: error.message, variant: 'destructive' });
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, name, icon, parentId }: { id: string; name?: string; icon?: string; parentId?: string | null }) => {
      const updates: Partial<WorkspaceFolder> = {};
      if (name !== undefined) updates.name = name;
      if (icon !== undefined) updates.icon = icon;
      if (parentId !== undefined) updates.parent_id = parentId;

      const { data, error } = await supabase
        .from('workspace_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-folders'] });
      toast({ title: 'Pasta atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar pasta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_folders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-folders'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      toast({ title: 'Pasta excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pasta', description: error.message, variant: 'destructive' });
    },
  });

  return {
    folders,
    isLoading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
