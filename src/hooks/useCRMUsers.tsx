import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import bcrypt from "bcryptjs";

export interface CRMUser {
  id: string;
  workspace_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'collaborator';
  is_active: boolean;
  created_at: string;
}

interface CreateUserData {
  email: string;
  fullName: string;
  role: 'admin' | 'collaborator';
  password: string;
}

interface UpdateUserData {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'collaborator';
}

export const useCRMUsers = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['crm-users', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('crm_users')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CRMUser[];
    },
    enabled: !!workspaceId,
  });

  // Create user
  const createUser = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!workspaceId) throw new Error("Workspace ID is required");

      // Hash password with bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      const { data, error } = await supabase
        .from('crm_users')
        .insert({
          workspace_id: workspaceId,
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role,
          password_hash: passwordHash,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-users', workspaceId] });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        toast.error("Este email já está cadastrado neste workspace");
      } else {
        toast.error("Erro ao criar usuário");
      }
    },
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateUserData }) => {
      const { data, error } = await supabase
        .from('crm_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-users', workspaceId] });
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário");
    },
  });

  // Toggle user active status
  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('crm_users')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-users', workspaceId] });
      toast.success(variables.isActive ? "Usuário ativado" : "Usuário bloqueado");
    },
    onError: (error: any) => {
      console.error("Error toggling user status:", error);
      toast.error("Erro ao alterar status do usuário");
    },
  });

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-users', workspaceId] });
      toast.success("Usuário removido com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting user:", error);
      toast.error("Erro ao remover usuário");
    },
  });

  // Reset password
  const resetPassword = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const { data, error } = await supabase
        .from('crm_users')
        .update({ password_hash: passwordHash })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-users', workspaceId] });
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error resetting password:", error);
      toast.error("Erro ao redefinir senha");
    },
  });

  return {
    users: users || [],
    isLoading,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    resetPassword,
  };
};
