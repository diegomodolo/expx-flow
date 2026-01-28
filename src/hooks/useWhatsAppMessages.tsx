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
  cached_media_url: string | null;
  status: string;
  external_id: string | null;
  sent_at: string;
  reaction: string | null;
}

export interface MediaAttachment {
  file: File;
  type: "image" | "video" | "document" | "audio";
  preview?: string;
}

export function useWhatsAppMessages(conversationId: string | null, companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetchingFromApi, setIsFetchingFromApi] = useState(false);
  const [hasFetchedFromApi, setHasFetchedFromApi] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);

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
  const sendMessage = useCallback(async ({ phone, message, instanceId }: { phone: string; message: string; instanceId?: string | null }) => {
    if (!companyId || !conversationId) return;

    const now = new Date().toISOString();

    // First, save to DB to get the real ID
    let savedMessageId: string | null = null;
    
    try {
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
      savedMessageId = savedMessage.id;

      // Add to cache with real ID (Realtime may also add it, but this is instant)
      const optimisticMessage: WhatsAppMessage = {
        id: savedMessage.id,
        conversation_id: conversationId,
        company_id: companyId,
        direction: "outgoing",
        content: message,
        message_type: "text",
        media_url: null,
        cached_media_url: null,
        status: "sending",
        external_id: null,
        sent_at: now,
        reaction: null,
      };

      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return [optimisticMessage];
          // Avoid duplicates (Realtime might have already added it)
          if (old.some(m => m.id === savedMessage.id)) return old;
          return [...old, optimisticMessage];
        }
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

      // Update conversation in DB
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
          instance_id: instanceId ?? undefined,
        },
      });

      // Update message status based on result
      const newStatus = (error || !data?.success) ? "failed" : "sent";

      // If provider returned the message id, persist it so we can delete/react later
      const externalIdFromProvider: string | null = data?.message_id || null;
      
      await supabase
        .from("whatsapp_messages")
        .update({
          status: newStatus,
          ...(externalIdFromProvider ? { external_id: externalIdFromProvider } : {}),
        })
        .eq("id", savedMessage.id);

      // Update cache with new status
      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === savedMessage.id
              ? { ...msg, status: newStatus, ...(externalIdFromProvider ? { external_id: externalIdFromProvider } : {}) }
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
      // If we have a saved message ID, mark it as failed
      if (savedMessageId) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "failed" })
          .eq("id", savedMessageId);

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.id === savedMessageId ? { ...msg, status: "failed" } : msg
            );
          }
        );
      }

      toast({
        title: "Erro ao enviar mensagem",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [companyId, conversationId, queryClient, toast]);

  // Send media with optimistic UI
  const sendMedia = useCallback(async ({ 
    phone, 
    media, 
    caption, 
    instanceId 
  }: { 
    phone: string; 
    media: MediaAttachment; 
    caption: string; 
    instanceId?: string | null 
  }) => {
    if (!companyId || !conversationId) return;

    setIsSendingMedia(true);
    const now = new Date().toISOString();

    // Determine message_type from media type
    const messageTypeMap: Record<string, string> = {
      image: "image",
      video: "video",
      document: "document",
      audio: "audio",
    };
    const messageType = messageTypeMap[media.type] || "document";

    let savedMessageId: string | null = null;

    try {
      // Convert file to base64
      const base64 = await fileToBase64(media.file);

      // Save to DB first
      const { data: savedMessage, error: saveError } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          direction: "outgoing",
          content: caption || `[${media.type}] ${media.file.name}`,
          message_type: messageType,
          status: "sending",
          sent_at: now,
        })
        .select("id")
        .single();

      if (saveError) throw saveError;
      savedMessageId = savedMessage.id;

      // Add to cache immediately
      const optimisticMessage: WhatsAppMessage = {
        id: savedMessage.id,
        conversation_id: conversationId,
        company_id: companyId,
        direction: "outgoing",
        content: caption || `[${media.type}] ${media.file.name}`,
        message_type: messageType,
        media_url: media.preview || null,
        cached_media_url: media.preview || null,
        status: "sending",
        external_id: null,
        sent_at: now,
        reaction: null,
      };

      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return [optimisticMessage];
          if (old.some(m => m.id === savedMessage.id)) return old;
          return [...old, optimisticMessage];
        }
      );

      // Update conversation preview
      const preview = caption || `📎 ${media.type === "image" ? "Imagem" : media.type === "video" ? "Vídeo" : media.type === "audio" ? "Áudio" : "Documento"}`;
      queryClient.setQueryData(
        ["whatsapp-conversations", companyId],
        (old: any) => {
          if (!old) return old;
          return old.map((conv: any) =>
            conv.id === conversationId
              ? { ...conv, last_message_at: now, last_message_preview: preview.substring(0, 100) }
              : conv
          );
        }
      );

      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: now,
          last_message_preview: preview.substring(0, 100),
        })
        .eq("id", conversationId);

      // Send via API
      const { data, error } = await supabase.functions.invoke("send-whatsapp-media", {
        body: {
          company_id: companyId,
          recipient_phone: phone,
          type: media.type,
          file: base64,
          caption: caption || undefined,
          doc_name: media.type === "document" ? media.file.name : undefined,
          instance_id: instanceId ?? undefined,
        },
      });

      const newStatus = (error || !data?.success) ? "failed" : "sent";
      const externalIdFromProvider: string | null = data?.message_id || null;

      await supabase
        .from("whatsapp_messages")
        .update({
          status: newStatus,
          ...(externalIdFromProvider ? { external_id: externalIdFromProvider } : {}),
        })
        .eq("id", savedMessage.id);

      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === savedMessage.id
              ? { ...msg, status: newStatus, ...(externalIdFromProvider ? { external_id: externalIdFromProvider } : {}) }
              : msg
          );
        }
      );

      if (error || !data?.success) {
        toast({
          title: "Erro ao enviar mídia",
          description: data?.error || error?.message || "Falha no envio",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      if (savedMessageId) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "failed" })
          .eq("id", savedMessageId);

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.id === savedMessageId ? { ...msg, status: "failed" } : msg
            );
          }
        );
      }

      toast({
        title: "Erro ao enviar mídia",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingMedia(false);
    }
  }, [companyId, conversationId, queryClient, toast]);

  return {
    messages: messages || [],
    isLoading: isLoadingFromDb || isFetchingFromApi,
    isFetchingFromApi,
    isSendingMedia,
    error,
    sendMessage,
    sendMedia,
    fetchMessagesFromApi,
    isSending: false,
  };
}

// Helper to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
