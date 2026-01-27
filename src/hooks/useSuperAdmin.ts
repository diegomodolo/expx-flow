import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserCompany {
  id: string;
  name: string;
  role: string;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
  companies: UserCompany[];
}

export function useSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("super-admin", {
        body: { action: "check-super-admin" },
      });

      setIsSuperAdmin(response.data?.isSuperAdmin || false);
    } catch (error) {
      console.error("Erro ao verificar super admin:", error);
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await supabase.functions.invoke("super-admin", {
        body: { action: "list-users" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      throw error;
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const removeFromCompany = async (userId: string, companyId: string) => {
    const response = await supabase.functions.invoke("super-admin", {
      body: { action: "remove-from-company", userId, companyId },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Atualizar lista local
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          companies: u.companies.filter(c => c.id !== companyId),
        };
      }
      return u;
    }));

    return response.data;
  };

  const deleteUser = async (userId: string) => {
    const response = await supabase.functions.invoke("super-admin", {
      body: { action: "delete-user", userId },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Remover da lista local
    setUsers(prev => prev.filter(u => u.id !== userId));

    return response.data;
  };

  return {
    isSuperAdmin,
    isLoading,
    users,
    isLoadingUsers,
    loadUsers,
    removeFromCompany,
    deleteUser,
  };
}
