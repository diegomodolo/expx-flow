import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState, useEffect } from "react";

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  direction: "incoming" | "outgoing";
  content: string;
  message_type: string;
  media_url: string | null;
  status: string;
  external_id: string | null;
  sent_at: string;
}

export function useWhatsAppMessages(conversationId: string | null, companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetchingFromApi, setIsFetchingFromApi] = useState(false);
  const [hasFetchedFromApi, setHasFetchedFromApi] = useState(false);

  // Reset fetch state when conversation changes
  useEffect(() => {
    setHasFetchedFromApi(false);
  }, [conversationId]);

  const { data: messages, isLoading: isLoadingFromDb, error } = useQuery({
    queryKey: ["whatsapp-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });
  // Fetch messages from API - can be called manually to refresh
  const fetchMessagesFromApi = useCallback(async (forceRefresh = false) => {
    // Block if already fetching, but allow manual refresh (forceRefresh = true)
    if (!conversationId || !companyId || isFetchingFromApi) return;
    if (!forceRefresh && hasFetchedFromApi) return;

    setIsFetchingFromApi(true);
    console.log("[useWhatsAppMessages] Buscando mensagens da API para:", conversationId, "forceRefresh:", forceRefresh);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-whatsapp-messages", {
        body: {
          conversation_id: conversationId,
          company_id: companyId,
        },
      });

      if (error) {
        console.error("[useWhatsAppMessages] Erro ao buscar mensagens da API:", error);
        toast({
          title: "Erro ao buscar mensagens",
          description: error.message || "Falha ao carregar mensagens",
          variant: "destructive",
        });
      } else if (data?.success) {
        console.log(`[useWhatsAppMessages] Mensagens obtidas: ${data.fetched}, salvas: ${data.saved}`);
        // Invalidate to reload from DB with new messages
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", conversationId] });
        
        if (data.fetched > 0) {
          toast({
            title: "Mensagens atualizadas",
            description: `${data.saved} novas mensagens carregadas`,
          });
        }
      } else if (data?.error) {
        console.error("[useWhatsAppMessages] Erro da API:", data.error);
        toast({
          title: "Erro ao buscar mensagens",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("[useWhatsAppMessages] Exceção ao buscar mensagens:", err);
      toast({
        title: "Erro ao buscar mensagens",
        description: err.message || "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFromApi(false);
      setHasFetchedFromApi(true);
    }
  }, [conversationId, companyId, isFetchingFromApi, hasFetchedFromApi, queryClient, toast]);

  // Auto-fetch from API when we first load a conversation with no messages
  useEffect(() => {
    if (conversationId && companyId && !isLoadingFromDb && messages?.length === 0 && !hasFetchedFromApi && !isFetchingFromApi) {
      fetchMessagesFromApi();
    }
  }, [conversationId, companyId, isLoadingFromDb, messages, hasFetchedFromApi, isFetchingFromApi, fetchMessagesFromApi]);

  // Optimistic send - shows message immediately
  const sendMessage = useCallback(async ({ phone, message }: { phone: string; message: string }) => {
    if (!companyId || !conversationId) return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // Create optimistic message
    const optimisticMessage: WhatsAppMessage = {
      id: tempId,
      conversation_id: conversationId,
      company_id: companyId,
      direction: "outgoing",
      content: message,
      message_type: "text",
      media_url: null,
      status: "sending",
      external_id: null,
      sent_at: now,
    };

    // Immediately add to cache (optimistic update)
    queryClient.setQueryData<WhatsAppMessage[]>(
      ["whatsapp-messages", conversationId],
      (old) => [...(old || []), optimisticMessage]
    );

    // Update conversation preview optimistically
    queryClient.setQueryData(
      ["whatsapp-conversations", companyId],
      (old: any) => {
        if (!old) return old;
        return old.map((conv: any) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: now, last_message_preview: message.substring(0, 100) }
            : conv
        );
      }
    );

    // Send in background
    try {
      // First, save to DB immediately
      const { data: savedMessage, error: saveError } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          direction: "outgoing",
          content: message,
          message_type: "text",
          status: "sending",
          sent_at: now,
        })
        .select("id")
        .single();

      if (saveError) throw saveError;

      // Update conversation
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: now,
          last_message_preview: message.substring(0, 100),
        })
        .eq("id", conversationId);

      // Send via API (background)
      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          company_id: companyId,
          recipient_phone: phone,
          message,
          notification_type: "chat",
        },
      });

      // Update message status based on result
      const newStatus = (error || !data?.success) ? "failed" : "sent";
      
      await supabase
        .from("whatsapp_messages")
        .update({ status: newStatus })
        .eq("id", savedMessage.id);

      // Update cache with real message
      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === tempId
              ? { ...msg, id: savedMessage.id, status: newStatus }
              : msg
          );
        }
      );

      if (error || !data?.success) {
        toast({
          title: "Erro ao enviar mensagem",
          description: data?.error || error?.message || "Falha no envio",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      // Mark as failed in cache
      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === tempId ? { ...msg, status: "failed" } : msg
          );
        }
      );

      toast({
        title: "Erro ao enviar mensagem",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [companyId, conversationId, queryClient, toast]);

  return {
    messages: messages || [],
    isLoading: isLoadingFromDb || isFetchingFromApi,
    isFetchingFromApi,
    error,
    sendMessage,
    fetchMessagesFromApi,
    isSending: false,
  };
}
