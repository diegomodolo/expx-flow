import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConversation {
  id: string;
  company_id: string;
  phone: string;
  contact_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  is_archived: boolean;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConversations(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["whatsapp-conversations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as WhatsAppConversation[];
    },
    enabled: !!companyId,
  });

  const markAsRead = async (conversationId: string) => {
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
    
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
  };

  const archiveConversation = async (conversationId: string) => {
    await supabase
      .from("whatsapp_conversations")
      .update({ is_archived: true })
      .eq("id", conversationId);
    
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
  };

  return {
    conversations: conversations || [],
    isLoading,
    error,
    markAsRead,
    archiveConversation,
  };
}
