import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  invokeWithRetry,
  getEdgeFunctionErrorMessage,
} from "@/lib/invokeWithRetry";

export function useSyncWhatsAppChats(companyId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const queryClient = useQueryClient();

  const syncChats = async (instanceId: string) => {
    if (!companyId || !instanceId || isSyncing) {
      return { success: false, synced: 0 };
    }

    setIsSyncing(true);

    try {
      const data = await invokeWithRetry(supabase, "sync-whatsapp-chats", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
        },
      });

      if (data?.success) {
        // Invalidar cache para recarregar conversas
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-conversations", companyId, instanceId],
        });

        if (data.synced === 0) {
          // Se nenhuma conversa foi encontrada, apenas log (sem toast)
        }

        return {
          success: true,
          synced: data.synced || 0,
          attempts: data.attempts,
        };
      } else {
        const errorMessage = data?.error || "Erro desconhecido";
        console.error(
          "[useSyncWhatsAppChats] Resposta com erro:",
          errorMessage,
        );
        toast.error(errorMessage);
        return { success: false, synced: 0 };
      }
    } catch (err) {
      console.error("[useSyncWhatsAppChats] Exceção:", err);
      toast.error(getEdgeFunctionErrorMessage(err));
      return { success: false, synced: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  const configureWebhook = async (instanceId: string) => {
    if (!instanceId || isConfiguringWebhook) {
      return { success: false };
    }

    setIsConfiguringWebhook(true);

    try {
      const data = await invokeWithRetry(supabase, "configure-uazapi-webhook", {
        body: {
          instance_id: instanceId,
        },
      });

      if (data?.success) {
        toast.success("Webhook configurado com sucesso!");
        return { success: true, webhook_url: data.webhook_url };
      } else {
        const errorMessage = data?.error || "Erro ao configurar webhook";
        console.error(
          "[useSyncWhatsAppChats] Webhook erro:",
          errorMessage,
          data?.attempts,
        );
        toast.error(errorMessage);
        return { success: false, attempts: data?.attempts };
      }
    } catch (err) {
      console.error("[useSyncWhatsAppChats] Exceção webhook:", err);
      toast.error(getEdgeFunctionErrorMessage(err));
      return { success: false };
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  return {
    syncChats,
    isSyncing,
    configureWebhook,
    isConfiguringWebhook,
  };
}
