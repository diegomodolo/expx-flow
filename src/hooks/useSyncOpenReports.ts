import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { UserReport } from "@/hooks/useUserReports";

export function useSyncOpenReports(
  reports: UserReport[],
  companyId: string | undefined
) {
  const queryClient = useQueryClient();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!companyId || reports.length === 0 || syncedRef.current) return;

    const openReports = reports.filter(
      (r) =>
        (r.status === "aberto" || r.status === "em_analise") &&
        r.github_issue_number
    );

    if (openReports.length === 0) return;

    syncedRef.current = true;

    const syncAll = async () => {
      const results = await Promise.allSettled(
        openReports.map(async (report) => {
          const { data, error } = await supabase.functions.invoke(
            "fetch-github-issue-status",
            {
              body: {
                report_id: report.id,
                github_issue_number: report.github_issue_number,
              },
            }
          );
          if (error || !data?.success) return null;
          return data.data as UserReport;
        })
      );

      const updated = results
        .filter(
          (r): r is PromiseFulfilledResult<UserReport | null> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value!);

      if (updated.length > 0) {
        queryClient.setQueryData<UserReport[]>(
          ["user-reports", companyId],
          (old) => {
            if (!old) return old;
            const updatedMap = new Map(updated.map((u) => [u.id, u]));
            return old.map((r) => updatedMap.get(r.id) || r);
          }
        );
      }
    };

    syncAll();
  }, [reports, companyId, queryClient]);
}
