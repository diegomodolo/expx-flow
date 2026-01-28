import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConversationTemperature = "positive" | "neutral" | "negative" | null;

export interface WhatsAppConversation {
  id: string;
  company_id: string;
  instance_id: string | null;
  phone: string;
  contact_name: string | null;
  profile_pic_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  client_id: string | null;
  client_name?: string | null; // Joined from clients table
  client_logo_url?: string | null; // Joined from clients table
  client_team_id?: string | null; // Joined from clients table
  label_ids: string[] | null; // Labels assigned to this conversation
  temperature?: ConversationTemperature; // From realtime analysis
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConversations(
  companyId: string | undefined, 
  instanceId?: string | null, 
  includeArchived: boolean = false,
  squadFilterId?: string | null // Filter by squad (team) - shows only conversations with clients from this squad
) {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["whatsapp-conversations", companyId, instanceId, includeArchived, squadFilterId],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          clients:client_id (name, avatar, team_id),
          whatsapp_realtime_analysis (temperature)
        `)
        .eq("company_id", companyId)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false });

      // Filter by archived status
      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      // Filter by instance if provided
      if (instanceId) {
        query = query.eq("instance_id", instanceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to flatten client name, avatar and temperature
      let transformed = (data || []).map((conv: any) => ({
        ...conv,
        client_name: conv.clients?.name || null,
        client_logo_url: conv.clients?.avatar || null,
        client_team_id: conv.clients?.team_id || null,
        temperature: conv.whatsapp_realtime_analysis?.temperature || null,
        clients: undefined, // Remove nested object
        whatsapp_realtime_analysis: undefined, // Remove nested object
      }));
      
      // Filter by squad if squadFilterId is provided
      // Only show conversations that have a client linked AND that client belongs to the squad
      if (squadFilterId) {
        transformed = transformed.filter(
          (conv: any) => conv.client_id && conv.client_team_id === squadFilterId
        );
      }
      
      return transformed as WhatsAppConversation[];
    },
    enabled: !!companyId,
  });

  const markAsRead = async (conversationId: string) => {
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
    
    // Invalidate both archived and non-archived queries
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
  };

  const archiveConversation = async (conversationId: string) => {
    await supabase
      .from("whatsapp_conversations")
      .update({ is_archived: true })
      .eq("id", conversationId);
    
    // Invalidate both archived and non-archived queries
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
  };

  const refetchConversations = () => {
    // Invalidate all conversation queries for this company
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", companyId] });
  };

  return {
    conversations: conversations || [],
    isLoading,
    error,
    markAsRead,
    archiveConversation,
    refetchConversations,
  };
}
