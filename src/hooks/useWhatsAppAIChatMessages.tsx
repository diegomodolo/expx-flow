import { useState, useEffect, useCallback } from "react";
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

export function useWhatsAppAIChatMessages(
  conversationId: string | undefined,
  companyId: string | undefined
) {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["whatsapp-ai-chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !companyId) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_ai_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AIMessage[];
    },
    enabled: !!conversationId && !!companyId,
  });

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
    onSuccess: () => {
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
    messages: messages || [],
    isLoading,
    addMessage,
    addAnalysisMessage,
    clearMessages,
    isAdding: addMessageMutation.isPending,
  };
}
