import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceShare, WorkspaceShareWithUser } from "@/types/workspace";

export function useWorkspaceShares(
  resourceType?: "folder" | "document",
  resourceId?: string,
) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companyUsers = [] } = useQuery({
    queryKey: ["company-users-for-share", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      // Get only active employees from the company
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("user_id, name, avatar")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "active");

      if (employeesError) throw employeesError;
      if (!employees || employees.length === 0) return [];

      return employees
        .filter((emp: unknown) => emp.user_id) // Only employees with linked user accounts
        .map((emp: unknown) => ({
          user_id: emp.user_id,
          full_name: emp.name || "Usuário",
          avatar_url: emp.avatar,
        }));
    },
    enabled: !!activeCompany?.company_id,
  });

  const { data: rawShares = [], isLoading } = useQuery({
    queryKey: ["workspace-shares", resourceType, resourceId],
    queryFn: async () => {
      if (!resourceType || !resourceId) return [];

      const { data, error } = await supabase
        .from("workspace_shares")
        .select("*")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId);

      if (error) throw error;
      return (data || []) as WorkspaceShare[];
    },
    enabled: !!resourceType && !!resourceId,
  });

  // Enrich shares with user info from companyUsers (avoids FK dependency on profiles)
  const shares: WorkspaceShareWithUser[] = rawShares.map((share) => {
    const userInfo = companyUsers.find(
      (u) => u.user_id === share.shared_with_user_id,
    );
    return {
      ...share,
      shared_with_user: userInfo
        ? {
            full_name: userInfo.full_name,
            avatar_url: userInfo.avatar_url,
          }
        : undefined,
    };
  });

  const createShare = useMutation({
    mutationFn: async ({
      resourceType,
      resourceId,
      sharedWithUserId,
      permission,
    }: {
      resourceType: "folder" | "document";
      resourceId: string;
      sharedWithUserId: string;
      permission: "view" | "edit" | "admin";
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("workspace_shares")
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
      queryClient.invalidateQueries({ queryKey: ["workspace-shares"] });
      toast({ title: "Compartilhamento criado!" });
    },
    onError: (error: unknown) => {
      const err = error as { code?: string; message?: string };
      if (err.code === "23505") {
        toast({ title: "Este usuário já tem acesso", variant: "destructive" });
      } else {
        toast({
          title: "Erro ao compartilhar",
          description: err.message,
          variant: "destructive",
        });
      }
    },
  });

  const updateShare = useMutation({
    mutationFn: async ({
      id,
      permission,
    }: {
      id: string;
      permission: "view" | "edit" | "admin";
    }) => {
      const { data, error } = await supabase
        .from("workspace_shares")
        .update({ permission })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-shares"] });
      toast({ title: "Permissão atualizada!" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao atualizar permissão",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const deleteShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_shares")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-shares"] });
      toast({ title: "Acesso removido!" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao remover acesso",
        description: (error as Error).message,
        variant: "destructive",
      });
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
