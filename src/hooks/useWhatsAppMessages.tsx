import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const { data: messages, isLoading, error } = useQuery({
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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      if (!companyId) throw new Error("Company ID required");

      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          company_id: companyId,
          recipient_phone: phone,
          message,
          notification_type: "chat",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Also save to messages table
      if (conversationId) {
        await supabase
          .from("whatsapp_messages")
          .insert({
            conversation_id: conversationId,
            company_id: companyId,
            direction: "outgoing",
            content: message,
            message_type: "text",
            status: "sent",
            sent_at: new Date().toISOString(),
          });

        // Update conversation
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: message.substring(0, 100),
          })
          .eq("id", conversationId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
  };
}
