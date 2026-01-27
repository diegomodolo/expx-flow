import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppRealtime(companyId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId) return;

    // Subscribe to conversations changes
    const conversationsChannel = supabase
      .channel("whatsapp-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log("[WhatsApp Realtime] Conversation change:", payload);
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
        }
      )
      .subscribe();

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel("whatsapp-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log("[WhatsApp Realtime] New message:", payload);
          const newMessage = payload.new as any;
          
          // Invalidate messages for the specific conversation
          queryClient.invalidateQueries({ 
            queryKey: ["whatsapp-messages", newMessage.conversation_id] 
          });
          
          // Also invalidate conversations list to update last message
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [companyId, queryClient]);
}
