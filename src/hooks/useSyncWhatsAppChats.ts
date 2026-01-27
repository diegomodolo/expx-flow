import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        } else {
          // Se nenhuma conversa foi encontrada, sugerir configurar webhook
          console.log("[useSyncWhatsAppChats] Nenhuma conversa encontrada. Tentativas:", data.attempts);
        }

        return { success: true, synced: data.synced || 0, attempts: data.attempts };
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

  const configureWebhook = async (instanceId: string) => {
    if (!instanceId || isConfiguringWebhook) {
      return { success: false };
    }

    setIsConfiguringWebhook(true);

    try {
      const { data, error } = await supabase.functions.invoke("configure-uazapi-webhook", {
        body: {
          instance_id: instanceId,
        },
      });

      if (error) {
        console.error("[useSyncWhatsAppChats] Erro ao configurar webhook:", error);
        toast.error("Erro ao configurar webhook");
        return { success: false };
      }

      if (data?.success) {
        toast.success("Webhook configurado com sucesso!");
        console.log("[useSyncWhatsAppChats] Webhook configurado:", data);
        return { success: true, webhook_url: data.webhook_url };
      } else {
        const errorMessage = data?.error || "Erro ao configurar webhook";
        console.error("[useSyncWhatsAppChats] Webhook erro:", errorMessage, data?.attempts);
        toast.error(errorMessage);
        return { success: false, attempts: data?.attempts };
      }
    } catch (err) {
      console.error("[useSyncWhatsAppChats] Exceção webhook:", err);
      toast.error("Erro ao configurar webhook");
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
