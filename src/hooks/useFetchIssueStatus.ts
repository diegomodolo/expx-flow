import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserReport } from "@/hooks/useUserReports";

interface FetchStatusInput {
  report_id: string;
  github_issue_number: number;
  company_id: string;
}

export function useFetchIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FetchStatusInput) => {
      const { data, error } = await supabase.functions.invoke(
        "fetch-github-issue-status",
        {
          body: {
            report_id: input.report_id,
            github_issue_number: input.github_issue_number,
          },
        }
      );

      if (error) throw new Error(error.message || "Erro ao buscar status");
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar status");

      return data.data as UserReport;
    },
    onSuccess: (updatedReport, variables) => {
      queryClient.setQueryData<UserReport[]>(
        ["user-reports", variables.company_id],
        (old) => {
          if (!old) return old;
          return old.map((r) =>
            r.id === updatedReport.id ? updatedReport : r
          );
        }
      );
    },
    onError: () => {
      toast.error("Não foi possível atualizar o status");
    },
  });
}
