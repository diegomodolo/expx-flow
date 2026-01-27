import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSyncWhatsAppChats(companyId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const syncChats = async (instanceId: string) => {
    if (!companyId || !instanceId || isSyncing) {
      return { success: false, synced: 0 };
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke("sync-whatsapp-chats", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
        },
      });

      if (error) {
        console.error("[useSyncWhatsAppChats] Erro ao sincronizar:", error);
        toast.error("Erro ao sincronizar conversas");
        return { success: false, synced: 0 };
      }

      if (data?.success) {
        // Invalidar cache para recarregar conversas
        queryClient.invalidateQueries({ 
          queryKey: ["whatsapp-conversations", companyId, instanceId] 
        });

        if (data.synced > 0) {
          toast.success(`${data.synced} conversas sincronizadas`);
        }

        return { success: true, synced: data.synced || 0 };
      } else {
        const errorMessage = data?.error || "Erro desconhecido";
        console.error("[useSyncWhatsAppChats] Resposta com erro:", errorMessage);
        toast.error(errorMessage);
        return { success: false, synced: 0 };
      }
    } catch (err) {
      console.error("[useSyncWhatsAppChats] Exceção:", err);
      toast.error("Erro ao sincronizar conversas");
      return { success: false, synced: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncChats,
    isSyncing,
  };
}
