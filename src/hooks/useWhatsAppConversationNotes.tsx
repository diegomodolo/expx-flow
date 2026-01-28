import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface WhatsAppConversationNote {
  id: string;
  conversationId: string;
  companyId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface RawNote {
  id: string;
  conversation_id: string;
  company_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function transformNote(raw: RawNote): WhatsAppConversationNote {
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    companyId: raw.company_id,
    userId: raw.user_id,
    content: raw.content,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useWhatsAppConversationNotes(conversationId: string | undefined) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: notes, isLoading, error } = useQuery({
    queryKey: ["whatsapp-conversation-notes", conversationId],
    queryFn: async () => {
      if (!conversationId || !activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("whatsapp_conversation_notes")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformNote);
    },
    enabled: !!conversationId && !!activeCompany?.company_id,
  });

  // Fetch profiles for note authors
  const userIds = [...new Set((notes || []).map((n) => n.userId))];
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-notes", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (error) throw error;

      const profilesMap: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        profilesMap[p.user_id] = p.full_name || "Usuário";
      });

      return profilesMap;
    },
    enabled: userIds.length > 0,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !activeCompany?.company_id) {
        throw new Error("No conversation or company");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("whatsapp_conversation_notes")
        .insert({
          conversation_id: conversationId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-notes", conversationId] });
      toast.success("Observação adicionada!");
    },
    onError: (error) => {
      console.error("Error adding note:", error);
      toast.error("Erro ao adicionar observação");
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("whatsapp_conversation_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-notes", conversationId] });
      toast.success("Observação removida!");
    },
    onError: (error) => {
      console.error("Error deleting note:", error);
      toast.error("Erro ao remover observação");
    },
  });

  return {
    notes: notes || [],
    profilesByUserId: profiles || {},
    isLoading,
    error,
    addNote,
    deleteNote,
  };
}
