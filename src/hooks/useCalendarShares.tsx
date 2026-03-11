import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface CalendarShare {
  id: string;
  company_id: string;
  owner_id: string;
  shared_with_id: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCalendarShares() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const sharesQuery = useQuery({
    queryKey: ["calendar-shares", activeCompany?.company_id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("calendar_shares" as any)
        .select("*")
        .eq("company_id", activeCompany!.company_id)
        .eq("is_active", true) as any);

      if (error) throw error;
      return (data || []) as CalendarShare[];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  const sharedWithMe = (sharesQuery.data || []).filter(
    (s) => s.shared_with_id === user?.id,
  );

  const myShares = (sharesQuery.data || []).filter(
    (s) => s.owner_id === user?.id,
  );

  const createShare = useMutation({
    mutationFn: async (sharedWithId: string) => {
      const { data, error } = await (supabase
        .from("calendar_shares" as any)
        .insert({
          company_id: activeCompany!.company_id,
          owner_id: user!.id,
          shared_with_id: sharedWithId,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-shares", activeCompany?.company_id],
      });
      toast.success("Calendário compartilhado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao compartilhar calendário");
    },
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await (supabase
        .from("calendar_shares" as any)
        .delete()
        .eq("id", shareId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-shares", activeCompany?.company_id],
      });
      toast.success("Compartilhamento removido");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover compartilhamento");
    },
  });

  return {
    shares: sharesQuery.data || [],
    sharedWithMe,
    myShares,
    loading: sharesQuery.isLoading,
    createShare: createShare.mutateAsync,
    removeShare: removeShare.mutateAsync,
    creatingShare: createShare.isPending,
  };
}
