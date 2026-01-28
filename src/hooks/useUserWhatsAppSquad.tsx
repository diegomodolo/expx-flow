import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserWhatsAppSquad {
  squadId: string;
  squadName: string;
  squadColor: string | null;
}

/**
 * Hook to get the squad where the current user is the WhatsApp responsible
 * Returns the squad info if user is whatsapp_responsible_id in any team
 */
export function useUserWhatsAppSquad(companyId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-whatsapp-squad", companyId, user?.id],
    queryFn: async (): Promise<UserWhatsAppSquad | null> => {
      if (!companyId || !user?.id) return null;

      // First, get the employee record for this user
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (employeeError || !employee) return null;

      // Find team where this employee is the whatsapp_responsible
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name, color")
        .eq("company_id", companyId)
        .eq("whatsapp_responsible_id", employee.id)
        .maybeSingle();

      if (teamError || !team) return null;

      return {
        squadId: team.id,
        squadName: team.name,
        squadColor: team.color,
      };
    },
    enabled: !!companyId && !!user?.id,
  });
}
