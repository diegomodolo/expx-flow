import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserReport {
  id: string;
  company_id: string;
  user_id: string;
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  github_issue_number: number | null;
  github_issue_url: string | null;
  status: "aberto" | "em_analise" | "implementado" | "recusado" | "fechado";
  claude_response: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserReports(companyId: string | undefined) {
  return useQuery({
    queryKey: ["user-reports", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserReport[];
    },
    enabled: !!companyId,
  });
}
