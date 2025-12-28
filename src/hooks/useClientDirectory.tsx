import { useMemo, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployeePermissions } from "./useEmployeePermissions";

export type ClientDirectoryItem = {
  id: string;
  name: string;
  company: string;
  avatar: string | null;
};

export function useClientDirectory() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { isOwner, permissionsLoading, currentUserPermissions } = useEmployeePermissions();

  const hasClientsPermission = currentUserPermissions.includes("clientes");
  const hasContentPermission = currentUserPermissions.includes("gerador-conteudo");
  const hasCampaignsPermission = currentUserPermissions.includes("campanhas");

  const hasAccess =
    isOwner || hasClientsPermission || hasContentPermission || hasCampaignsPermission;

  const query = useQuery({
    queryKey: ["client-directory", activeCompany?.company_id ?? null],
    enabled: !!user && !!activeCompany && hasAccess && (!permissionsLoading || isOwner),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 60 * 60 * 1000, // 1h
    queryFn: async (): Promise<ClientDirectoryItem[]> => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("id,name,company,avatar")
        .eq("company_id", activeCompany.company_id)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ClientDirectoryItem[];
    },
  });

  // Provide stable, always-available shape for consumers
  return {
    clients: hasAccess ? query.data ?? [] : ([] as ClientDirectoryItem[]),
    loading: hasAccess ? query.isLoading : false,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useClientDirectoryFilter(clients: ClientDirectoryItem[], search: string) {
  const deferredSearch = useDeferredValue(search);

  return useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)
    );
  }, [clients, deferredSearch]);
}
