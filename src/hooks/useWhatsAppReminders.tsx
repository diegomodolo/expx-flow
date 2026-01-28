import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface WhatsAppReminder {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  summary: string;
  nextActionDate: string;
  createdAt: string;
  createdByName: string | null;
  // New fields for chat navigation
  chatJid: string | null;
  chatName: string | null;
  conversationId: string | null;
  instanceId: string | null;
}

export function useWhatsAppReminders() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["whatsapp-reminders", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return { today: [], future: [] };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch touchpoints with next_action_date (reminders)
      const { data: touchpoints, error } = await supabase
        .from("client_touchpoints")
        .select(`
          id,
          client_id,
          summary,
          next_action,
          next_action_date,
          created_at,
          created_by,
          clients (
            id,
            name,
            avatar
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("touchpoint_type", "whatsapp")
        .not("next_action_date", "is", null)
        .gte("next_action_date", today.toISOString())
        .order("next_action_date", { ascending: true });

      if (error) throw error;

      // Fetch creator profiles
      const creatorIds = [...new Set((touchpoints || []).map((t: any) => t.created_by).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);
        
        (profiles || []).forEach((p: any) => {
          profilesMap[p.user_id] = p.full_name || "Usuário";
        });
      }

      // Fetch WhatsApp conversations for these clients to get chat_jid
      const clientIds = [...new Set((touchpoints || []).map((t: any) => t.client_id).filter(Boolean))];
      let conversationsMap: Record<string, { chatJid: string; chatName: string; conversationId: string; instanceId: string }> = {};
      
      if (clientIds.length > 0) {
        const { data: conversations } = await supabase
          .from("whatsapp_conversations")
          .select("id, client_id, chat_jid, chat_name, instance_id")
          .eq("company_id", activeCompany.company_id)
          .in("client_id", clientIds);
        
        (conversations || []).forEach((c: any) => {
          if (c.client_id) {
            conversationsMap[c.client_id] = {
              chatJid: c.chat_jid,
              chatName: c.chat_name,
              conversationId: c.id,
              instanceId: c.instance_id,
            };
          }
        });
      }

      // Transform and categorize
      const reminders: WhatsAppReminder[] = (touchpoints || []).map((t: any) => {
        const conv = conversationsMap[t.client_id];
        return {
          id: t.id,
          clientId: t.client_id,
          clientName: t.clients?.name || "Cliente",
          clientAvatar: t.clients?.avatar || null,
          summary: t.next_action || t.summary || "",
          nextActionDate: t.next_action_date,
          createdAt: t.created_at,
          createdByName: t.created_by ? profilesMap[t.created_by] || null : null,
          chatJid: conv?.chatJid || null,
          chatName: conv?.chatName || null,
          conversationId: conv?.conversationId || null,
          instanceId: conv?.instanceId || null,
        };
      });

      // Separate today vs future
      const todayReminders = reminders.filter((r) => {
        const date = new Date(r.nextActionDate);
        return date >= today && date < tomorrow;
      });

      const futureReminders = reminders.filter((r) => {
        const date = new Date(r.nextActionDate);
        return date >= tomorrow;
      });

      return {
        today: todayReminders,
        future: futureReminders,
        all: reminders,
      };
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Mutation to mark reminder as completed (delete the touchpoint)
  const completeReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("client_touchpoints")
        .delete()
        .eq("id", reminderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["client-touchpoints"] });
      toast.success("Lembrete concluído!");
    },
    onError: (error) => {
      console.error("Error completing reminder:", error);
      toast.error("Erro ao concluir lembrete");
    },
  });

  // Mutation to reschedule reminder
  const rescheduleReminder = useMutation({
    mutationFn: async ({ reminderId, newDate }: { reminderId: string; newDate: string }) => {
      const { error } = await supabase
        .from("client_touchpoints")
        .update({ next_action_date: newDate })
        .eq("id", reminderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["client-touchpoints"] });
      toast.success("Lembrete remarcado!");
    },
    onError: (error) => {
      console.error("Error rescheduling reminder:", error);
      toast.error("Erro ao remarcar lembrete");
    },
  });

  // Get client IDs with reminders for today (for badge indicator)
  const clientIdsWithTodayReminders = new Set(
    (data?.today || []).map((r) => r.clientId)
  );

  return {
    todayReminders: data?.today || [],
    futureReminders: data?.future || [],
    allReminders: data?.all || [],
    clientIdsWithTodayReminders,
    isLoading,
    error,
    refetch,
    completeReminder,
    rescheduleReminder,
  };
}
