import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceShare, WorkspaceShareWithUser } from "@/types/workspace";

export function useWorkspaceShares(resourceType?: 'folder' | 'document', resourceId?: string) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['workspace-shares', resourceType, resourceId],
    queryFn: async () => {
      if (!resourceType || !resourceId) return [];
      
      const { data, error } = await supabase
        .from('workspace_shares')
        .select(`
          *,
          profiles:shared_with_user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);
      
      if (error) throw error;
      
      // Get emails from auth.users via a separate query for user info
      const sharesWithUsers = await Promise.all(
        (data || []).map(async (share: any) => {
          const profile = share.profiles;
          return {
            ...share,
            shared_with_user: profile ? {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            } : undefined,
          };
        })
      );
      
      return sharesWithUsers as WorkspaceShareWithUser[];
    },
    enabled: !!resourceType && !!resourceId,
  });

  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users-for-share', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      // Get all company members
      const { data: members, error: membersError } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', activeCompany.company_id);
      
      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];
      
      const userIds = members.map(m => m.user_id);
      
      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      return (profiles || []).map((profile: any) => ({
        user_id: profile.user_id,
        full_name: profile.full_name || 'Usuário',
        avatar_url: profile.avatar_url,
      }));
    },
    enabled: !!activeCompany?.company_id,
  });

  const createShare = useMutation({
    mutationFn: async ({ 
      resourceType, 
      resourceId, 
      sharedWithUserId, 
      permission 
    }: { 
      resourceType: 'folder' | 'document';
      resourceId: string;
      sharedWithUserId: string;
      permission: 'view' | 'edit' | 'admin';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('workspace_shares')
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          shared_with_user_id: sharedWithUserId,
          permission,
          shared_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-shares'] });
      toast({ title: 'Compartilhamento criado!' });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'Este usuário já tem acesso', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao compartilhar', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateShare = useMutation({
    mutationFn: async ({ id, permission }: { id: string; permission: 'view' | 'edit' | 'admin' }) => {
      const { data, error } = await supabase
        .from('workspace_shares')
        .update({ permission })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WorkspaceShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-shares'] });
      toast({ title: 'Permissão atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
    },
  });

  const deleteShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_shares')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-shares'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover acesso', description: error.message, variant: 'destructive' });
    },
  });

  return {
    shares,
    companyUsers,
    isLoading,
    createShare,
    updateShare,
    deleteShare,
  };
}
