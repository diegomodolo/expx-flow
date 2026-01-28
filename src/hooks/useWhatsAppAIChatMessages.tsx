import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  user_id: string;
  role: "user" | "assistant" | "analysis";
  content: string;
  source_message_id: string | null;
  created_at: string;
  // For analysis messages, the content will be a JSON string with the analysis data
}

export interface AnalysisMessageContent {
  temperature: "positive" | "neutral" | "negative";
  interpretation: string;
  suggestion: string;
  departmentInsight: {
    type: string;
    insight: string;
    actionItems: string[];
  };
  alerts: string[];
  score: number;
  readyMessage: string;
}

const PAGE_SIZE = 30;

export function useWhatsAppAIChatMessages(
  conversationId: string | undefined,
  companyId: string | undefined
) {
  const queryClient = useQueryClient();
  const [hasMore, setHasMore] = useState(true);
  const [allMessages, setAllMessages] = useState<AIMessage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch the latest PAGE_SIZE messages (most recent first, then reverse for display)
  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ["whatsapp-ai-chat-messages", conversationId, "initial"],
    queryFn: async () => {
      if (!conversationId || !companyId) return [];
      
      // Get total count first
      const { count } = await supabase
        .from("whatsapp_ai_chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId);
      
      // Fetch last PAGE_SIZE messages ordered by created_at DESC
      const { data, error } = await supabase
        .from("whatsapp_ai_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      
      // Check if there are more messages
      const totalCount = count || 0;
      setHasMore(totalCount > PAGE_SIZE);
      
      // Reverse to get chronological order for display
      const messagesInOrder = (data as AIMessage[]).reverse();
      setAllMessages(messagesInOrder);
      
      return messagesInOrder;
    },
    enabled: !!conversationId && !!companyId,
  });

  // Load more older messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !companyId || isLoadingMore || !hasMore || allMessages.length === 0) return;
    
    setIsLoadingMore(true);
    
    try {
      const oldestMessage = allMessages[0];
      
      // Fetch PAGE_SIZE messages older than the oldest we have
      const { data, error } = await supabase
        .from("whatsapp_ai_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      
      const olderMessages = (data as AIMessage[]).reverse();
      
      if (olderMessages.length < PAGE_SIZE) {
        setHasMore(false);
      }
      
      if (olderMessages.length > 0) {
        setAllMessages(prev => [...olderMessages, ...prev]);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, companyId, isLoadingMore, hasMore, allMessages]);

  const addMessageMutation = useMutation({
    mutationFn: async (message: {
      role: "user" | "assistant" | "analysis";
      content: string;
      sourceMessageId?: string;
    }) => {
      if (!conversationId || !companyId) {
        throw new Error("Missing conversation or company ID");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("whatsapp_ai_chat_messages")
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          source_message_id: message.sourceMessageId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIMessage;
    },
    onSuccess: (newMessage) => {
      // Add new message directly to state for instant feedback
      setAllMessages(prev => [...prev, newMessage]);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-ai-chat-messages", conversationId] });
    },
  });

  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;

      const { error } = await supabase
        .from("whatsapp_ai_chat_messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      setAllMessages([]);
      setHasMore(false);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-ai-chat-messages", conversationId] });
    },
  });

  const addMessage = useCallback(
    (message: { role: "user" | "assistant" | "analysis"; content: string; sourceMessageId?: string }) => {
      return addMessageMutation.mutateAsync(message);
    },
    [addMessageMutation]
  );

  const addAnalysisMessage = useCallback(
    (analysisContent: AnalysisMessageContent) => {
      return addMessageMutation.mutateAsync({
        role: "analysis",
        content: JSON.stringify(analysisContent),
      });
    },
    [addMessageMutation]
  );

  const clearMessages = useCallback(() => {
    return clearMessagesMutation.mutateAsync();
  }, [clearMessagesMutation]);

  return {
    messages: allMessages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    addMessage,
    addAnalysisMessage,
    clearMessages,
    isAdding: addMessageMutation.isPending,
  };
}
