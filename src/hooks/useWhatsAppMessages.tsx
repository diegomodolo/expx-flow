import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useCallback, useState, useEffect } from "react";
import {
  invokeWithRetry,
  getEdgeFunctionErrorMessage,
} from "@/lib/invokeWithRetry";

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
  is_edited: boolean | null;
  edited_at: string | null;
  audio_transcription?: string | null;
  transcription_status?: string | null;
  reply_to_message_id?: string | null;
}

export interface MediaAttachment {
  file: File;
  type: "image" | "video" | "document" | "audio" | "ptt";
  preview?: string;
}

export function useWhatsAppMessages(
  conversationId: string | null,
  companyId: string | undefined,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetchingFromApi, setIsFetchingFromApi] = useState(false);
  const [hasFetchedFromApi, setHasFetchedFromApi] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // Reset fetch state when conversation changes
  useEffect(() => {
    setHasFetchedFromApi(false);
  }, [conversationId]);

  const {
    data: messages,
    isLoading: isLoadingFromDb,
    error,
  } = useQuery({
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

  // Realtime subscription for INSERT and UPDATE events on whatsapp_messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-realtime-${conversationId}`)
      .on<WhatsAppMessage>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as WhatsAppMessage;
          queryClient.setQueryData<WhatsAppMessage[]>(
            ["whatsapp-messages", conversationId],
            (old) => {
              if (!old) return [newMessage];
              // Avoid duplicates
              if (old.some((m) => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            },
          );
        },
      )
      .on<WhatsAppMessage>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as WhatsAppMessage;
          queryClient.setQueryData<WhatsAppMessage[]>(
            ["whatsapp-messages", conversationId],
            (old) => {
              if (!old) return old;
              return old.map((msg) =>
                msg.id === updated.id ? { ...msg, ...updated } : msg,
              );
            },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
  // Fetch messages from API - can be called manually to refresh
  const fetchMessagesFromApi = useCallback(
    async (forceRefresh = false) => {
      // Block if already fetching, but allow manual refresh (forceRefresh = true)
      if (!conversationId || !companyId || isFetchingFromApi) return;
      if (!forceRefresh && hasFetchedFromApi) return;

      setIsFetchingFromApi(true);

      try {
        const data = await invokeWithRetry(
          supabase,
          "fetch-whatsapp-messages",
          {
            body: {
              conversation_id: conversationId,
              company_id: companyId,
            },
          },
        );

        if (data?.success) {
          // Invalidate to reload from DB with new messages
          queryClient.invalidateQueries({
            queryKey: ["whatsapp-messages", conversationId],
          });
        } else if (data?.error) {
          console.error("[useWhatsAppMessages] Erro da API:", data.error);
          toast({
            title: "Erro ao buscar mensagens",
            description: data.error,
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
        console.error(
          "[useWhatsAppMessages] Exceção ao buscar mensagens:",
          err,
        );
        toast({
          title: "Erro ao buscar mensagens",
          description: getEdgeFunctionErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        setIsFetchingFromApi(false);
        setHasFetchedFromApi(true);
      }
    },
    [
      conversationId,
      companyId,
      isFetchingFromApi,
      hasFetchedFromApi,
      queryClient,
      toast,
    ],
  );

  // Auto-fetch from API in background
  // If we have cached messages, sync silently in background
  // If no cached messages, fetch from API (will show loading state only then)
  useEffect(() => {
    if (
      conversationId &&
      companyId &&
      !isLoadingFromDb &&
      !hasFetchedFromApi &&
      !isFetchingFromApi
    ) {
      fetchMessagesFromApi();
    }
  }, [
    conversationId,
    companyId,
    isLoadingFromDb,
    hasFetchedFromApi,
    isFetchingFromApi,
    fetchMessagesFromApi,
  ]);

  // Optimistic send - shows message immediately
  const sendMessage = useCallback(
    async ({
      phone,
      message,
      instanceId,
      replyToMessageId,
    }: {
      phone: string;
      message: string;
      instanceId?: string | null;
      replyToMessageId?: string;
    }) => {
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
            reply_to_message_id: replyToMessageId ?? null,
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
          is_edited: null,
          edited_at: null,
          reply_to_message_id: replyToMessageId ?? null,
        };

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return [optimisticMessage];
            // Avoid duplicates (Realtime might have already added it)
            if (old.some((m) => m.id === savedMessage.id)) return old;
            return [...old, optimisticMessage];
          },
        );

        // Update conversation preview optimistically
        queryClient.setQueryData(
          ["whatsapp-conversations", companyId],
          (old: unknown) => {
            if (!old) return old;
            return old.map((conv: unknown) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    last_message_at: now,
                    last_message_preview: message.substring(0, 100),
                  }
                : conv,
            );
          },
        );

        // Update conversation in DB
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message_at: now,
            last_message_preview: message.substring(0, 100),
          })
          .eq("id", conversationId);

        // Get the external_id of the quoted message for the API (if replying)
        let replyExternalId: string | undefined;
        if (replyToMessageId) {
          const cachedMessages = queryClient.getQueryData<WhatsAppMessage[]>([
            "whatsapp-messages",
            conversationId,
          ]);
          const quotedMessage = cachedMessages?.find(
            (m) => m.id === replyToMessageId,
          );
          replyExternalId = quotedMessage?.external_id ?? undefined;
        }

        // Send via API (background)
        let data: unknown = null;
        let sendError = false;
        try {
          data = await invokeWithRetry(supabase, "send-whatsapp-notification", {
            body: {
              company_id: companyId,
              recipient_phone: phone,
              message,
              notification_type: "chat",
              instance_id: instanceId ?? undefined,
              reply_to_message_id: replyExternalId, // Send external_id to API, not the UUID
            },
          });
        } catch {
          sendError = true;
        }

        // Update message status based on result
        const newStatus = sendError || !data?.success ? "failed" : "sent";

        // If provider returned the message id, persist it so we can delete/react later
        const externalIdFromProvider: string | null = data?.message_id || null;

        await supabase
          .from("whatsapp_messages")
          .update({
            status: newStatus,
            ...(externalIdFromProvider
              ? { external_id: externalIdFromProvider }
              : {}),
          })
          .eq("id", savedMessage.id);

        // Update cache with new status
        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.id === savedMessage.id
                ? {
                    ...msg,
                    status: newStatus,
                    ...(externalIdFromProvider
                      ? { external_id: externalIdFromProvider }
                      : {}),
                  }
                : msg,
            );
          },
        );

        if (sendError || !data?.success) {
          toast({
            title: "Erro ao enviar mensagem",
            description: data?.error || "Falha no envio",
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
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
                msg.id === savedMessageId ? { ...msg, status: "failed" } : msg,
              );
            },
          );
        }

        toast({
          title: "Erro ao enviar mensagem",
          description: getEdgeFunctionErrorMessage(err),
          variant: "destructive",
        });
      }
    },
    [companyId, conversationId, queryClient, toast],
  );

  // Send media with optimistic UI
  const sendMedia = useCallback(
    async ({
      phone,
      media,
      caption,
      instanceId,
    }: {
      phone: string;
      media: MediaAttachment;
      caption: string;
      instanceId?: string | null;
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
        ptt: "audio", // PTT (push-to-talk) is stored as audio in DB
      };
      const messageType = messageTypeMap[media.type] || "document";

      // For API call, use the original type (ptt for voice messages)
      const apiMediaType = media.type;

      // Generate user-friendly content for media messages (used in DB and UI)
      const getMediaContentLabel = (
        type: string,
        fileName: string,
        hasCaption: boolean,
      ): string => {
        if (hasCaption) return caption;
        switch (type) {
          case "ptt":
          case "audio":
            return "🎤 Mensagem de voz";
          case "image":
            return "📷 Foto";
          case "video":
            return "🎥 Vídeo";
          case "document":
            return `📄 ${fileName}`;
          default:
            return `📎 Arquivo`;
        }
      };
      const mediaContentLabel = getMediaContentLabel(
        media.type,
        media.file.name,
        !!caption,
      );

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
            content: mediaContentLabel,
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
          content: mediaContentLabel,
          message_type: messageType,
          media_url: media.preview || null,
          cached_media_url: media.preview || null,
          status: "sending",
          external_id: null,
          sent_at: now,
          reaction: null,
          is_edited: null,
          edited_at: null,
        };

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return [optimisticMessage];
            if (old.some((m) => m.id === savedMessage.id)) return old;
            return [...old, optimisticMessage];
          },
        );

        // Update conversation preview
        const preview =
          caption ||
          `📎 ${media.type === "image" ? "Imagem" : media.type === "video" ? "Vídeo" : media.type === "audio" || media.type === "ptt" ? "Mensagem de voz" : "Documento"}`;
        queryClient.setQueryData(
          ["whatsapp-conversations", companyId],
          (old: unknown) => {
            if (!old) return old;
            return old.map((conv: unknown) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    last_message_at: now,
                    last_message_preview: preview.substring(0, 100),
                  }
                : conv,
            );
          },
        );

        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message_at: now,
            last_message_preview: preview.substring(0, 100),
          })
          .eq("id", conversationId);

        // Send via API
        let data: unknown = null;
        let sendError = false;
        try {
          data = await invokeWithRetry(supabase, "send-whatsapp-media", {
            body: {
              company_id: companyId,
              recipient_phone: phone,
              type: apiMediaType, // Use ptt for voice messages
              file: base64,
              caption: caption || undefined,
              doc_name: media.type === "document" ? media.file.name : undefined,
              instance_id: instanceId ?? undefined,
            },
          });
        } catch {
          sendError = true;
        }

        const newStatus = sendError || !data?.success ? "failed" : "sent";
        const externalIdFromProvider: string | null = data?.message_id || null;

        await supabase
          .from("whatsapp_messages")
          .update({
            status: newStatus,
            ...(externalIdFromProvider
              ? { external_id: externalIdFromProvider }
              : {}),
          })
          .eq("id", savedMessage.id);

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.id === savedMessage.id
                ? {
                    ...msg,
                    status: newStatus,
                    ...(externalIdFromProvider
                      ? { external_id: externalIdFromProvider }
                      : {}),
                  }
                : msg,
            );
          },
        );

        if (sendError || !data?.success) {
          toast({
            title: "Erro ao enviar mídia",
            description: data?.error || "Falha no envio",
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
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
                msg.id === savedMessageId ? { ...msg, status: "failed" } : msg,
              );
            },
          );
        }

        toast({
          title: "Erro ao enviar mídia",
          description: getEdgeFunctionErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        setIsSendingMedia(false);
      }
    },
    [companyId, conversationId, queryClient, toast],
  );

  // Send poll with optimistic UI
  const sendPoll = useCallback(
    async ({
      phone,
      question,
      options,
      allowMultiple = false,
      instanceId,
    }: {
      phone: string;
      question: string;
      options: string[];
      allowMultiple?: boolean;
      instanceId?: string | null;
    }) => {
      if (!companyId || !conversationId) return;

      const now = new Date().toISOString();
      const pollData = { question, options, allow_multiple: allowMultiple };

      let savedMessageId: string | null = null;

      try {
        // Save to DB first
        const { data: savedMessage, error: saveError } = await supabase
          .from("whatsapp_messages")
          .insert({
            conversation_id: conversationId,
            company_id: companyId,
            direction: "outgoing",
            content: JSON.stringify(pollData),
            message_type: "poll",
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
          content: JSON.stringify(pollData),
          message_type: "poll",
          media_url: null,
          cached_media_url: null,
          status: "sending",
          external_id: null,
          sent_at: now,
          reaction: null,
          is_edited: null,
          edited_at: null,
        };

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return [optimisticMessage];
            if (old.some((m) => m.id === savedMessage.id)) return old;
            return [...old, optimisticMessage];
          },
        );

        // Update conversation preview
        const preview = `📊 Enquete: ${question}`;
        queryClient.setQueryData(
          ["whatsapp-conversations", companyId],
          (old: unknown) => {
            if (!old) return old;
            return old.map((conv: unknown) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    last_message_at: now,
                    last_message_preview: preview.substring(0, 100),
                  }
                : conv,
            );
          },
        );

        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message_at: now,
            last_message_preview: preview.substring(0, 100),
          })
          .eq("id", conversationId);

        // Send via API
        let data: unknown = null;
        let sendError = false;
        try {
          data = await invokeWithRetry(supabase, "send-poll", {
            body: {
              company_id: companyId,
              recipient_phone: phone,
              question,
              options,
              allow_multiple: allowMultiple,
              instance_id: instanceId ?? undefined,
            },
          });
        } catch {
          sendError = true;
        }

        const newStatus = sendError || !data?.success ? "failed" : "sent";
        const externalIdFromProvider: string | null = data?.message_id || null;

        await supabase
          .from("whatsapp_messages")
          .update({
            status: newStatus,
            ...(externalIdFromProvider
              ? { external_id: externalIdFromProvider }
              : {}),
          })
          .eq("id", savedMessage.id);

        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.id === savedMessage.id
                ? {
                    ...msg,
                    status: newStatus,
                    ...(externalIdFromProvider
                      ? { external_id: externalIdFromProvider }
                      : {}),
                  }
                : msg,
            );
          },
        );

        if (sendError || !data?.success) {
          toast({
            title: "Erro ao enviar enquete",
            description: data?.error || "Falha no envio",
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
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
                msg.id === savedMessageId ? { ...msg, status: "failed" } : msg,
              );
            },
          );
        }

        toast({
          title: "Erro ao enviar enquete",
          description: getEdgeFunctionErrorMessage(err),
          variant: "destructive",
        });
      }
    },
    [companyId, conversationId, queryClient, toast],
  );

  // Forward message to other conversations
  const forwardMessage = useCallback(
    async ({
      targetConversations,
      message,
      instanceId,
    }: {
      targetConversations: Array<{ id: string; phone: string }>;
      message: {
        content: string;
        message_type: string;
        media_url?: string | null;
      };
      instanceId?: string | null;
    }) => {
      const results = [];

      for (const target of targetConversations) {
        try {
          if (message.message_type === "text") {
            await invokeWithRetry(supabase, "send-whatsapp-notification", {
              body: {
                company_id: companyId,
                recipient_phone: target.phone,
                message: message.content,
                notification_type: "chat",
                instance_id: instanceId ?? undefined,
                forward: true,
              },
            });
          } else if (message.media_url) {
            await invokeWithRetry(supabase, "send-whatsapp-media", {
              body: {
                company_id: companyId,
                recipient_phone: target.phone,
                type: message.message_type,
                file: message.media_url,
                instance_id: instanceId ?? undefined,
                forward: true,
              },
            });
          }
          results.push({ id: target.id, success: true });
        } catch (err) {
          results.push({ id: target.id, success: false });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        sonnerToast.success(
          `Mensagem encaminhada para ${successCount} conversa${successCount > 1 ? "s" : ""}`,
        );
      }
      if (successCount < results.length) {
        sonnerToast.error(
          `Falha ao encaminhar para ${results.length - successCount} conversa${results.length - successCount > 1 ? "s" : ""}`,
        );
      }
    },
    [companyId],
  );

  // Only show loading skeleton if we have NO cached messages AND we're loading from DB
  // This implements "stale-while-revalidate" - show cached data immediately
  const hasCachedMessages = (messages?.length ?? 0) > 0;
  const showLoadingSkeleton = isLoadingFromDb && !hasCachedMessages;

  return {
    messages: messages || [],
    isLoading: showLoadingSkeleton,
    isFetchingFromApi,
    isSyncingInBackground: isFetchingFromApi && hasCachedMessages,
    isSendingMedia,
    error,
    sendMessage,
    sendMedia,
    sendPoll,
    forwardMessage,
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
