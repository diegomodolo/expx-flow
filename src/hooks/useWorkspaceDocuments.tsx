import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceDocument } from "@/types/workspace";

export function useWorkspaceDocuments(folderId?: string | null) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['workspace-documents', activeCompany?.company_id, folderId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      let query = supabase
        .from('workspace_documents')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('updated_at', { ascending: false });
      
      if (folderId === null) {
        query = query.is('folder_id', null);
      } else if (folderId) {
        query = query.eq('folder_id', folderId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as WorkspaceDocument[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['workspace-documents-all', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('workspace_documents')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkspaceDocument[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const { data: favoriteDocuments = [] } = useQuery({
    queryKey: ['workspace-documents-favorites', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('workspace_documents')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkspaceDocument[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const createDocument = useMutation({
    mutationFn: async ({ title, folderId, icon }: { title?: string; folderId?: string | null; icon?: string }) => {
      if (!activeCompany?.company_id || !user?.id) throw new Error('Missing company or user');
      
      const { data, error } = await supabase
        .from('workspace_documents')
        .insert({
          company_id: activeCompany.company_id,
          folder_id: folderId || null,
          title: title || 'Sem título',
          content: [],
          icon: icon || '📄',
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-all'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar documento', description: error.message, variant: 'destructive' });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, title, content, icon, folderId, isFavorite, coverImage }: { 
      id: string; 
      title?: string; 
      content?: any; 
      icon?: string;
      folderId?: string | null;
      isFavorite?: boolean;
      coverImage?: string | null;
    }) => {
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (icon !== undefined) updates.icon = icon;
      if (folderId !== undefined) updates.folder_id = folderId;
      if (isFavorite !== undefined) updates.is_favorite = isFavorite;
      if (coverImage !== undefined) updates.cover_image = coverImage;

      const { data, error } = await supabase
        .from('workspace_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-all'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-favorites'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar documento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-all'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-favorites'] });
      toast({ title: 'Documento excluído!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir documento', description: error.message, variant: 'destructive' });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { data, error } = await supabase
        .from('workspace_documents')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-all'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-documents-favorites'] });
      toast({ title: data.is_favorite ? 'Adicionado aos favoritos!' : 'Removido dos favoritos' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar favorito', description: error.message, variant: 'destructive' });
    },
  });

  return {
    documents,
    allDocuments,
    favoriteDocuments,
    isLoading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    toggleFavorite,
  };
}
