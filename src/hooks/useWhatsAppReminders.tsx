import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface WhatsAppReminder {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  summary: string;
  nextActionDate: string;
  createdAt: string;
  createdByName: string | null;
}

export function useWhatsAppReminders() {
  const { activeCompany } = useCompany();

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

      // Transform and categorize
      const reminders: WhatsAppReminder[] = (touchpoints || []).map((t: any) => ({
        id: t.id,
        clientId: t.client_id,
        clientName: t.clients?.name || "Cliente",
        clientAvatar: t.clients?.avatar || null,
        summary: t.next_action || t.summary || "",
        nextActionDate: t.next_action_date,
        createdAt: t.created_at,
        createdByName: t.created_by ? profilesMap[t.created_by] || null : null,
      }));

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
  };
}
