import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";

export type RejectionReason = "very_bad" | "bad" | "adjustments";

export const REJECTION_REASONS: Record<RejectionReason, { label: string; description: string; reduction: number }> = {
  very_bad: { label: "Muito ruim", description: "Tarefa precisa ser refeita completamente", reduction: 20 },
  bad: { label: "Ruim", description: "Tarefa com problemas significativos", reduction: 10 },
  adjustments: { label: "Só ajustes", description: "Pequenos ajustes necessários", reduction: 5 },
};

export interface TaskReviewHistoryItem {
  id: string;
  task_id: string;
  company_id: string;
  reviewer_employee_id: string;
  action: "approved" | "rejected";
  rejection_reason: RejectionReason | null;
  quality_before: number;
  quality_after: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
}

export function useTaskReview(taskId: string | undefined) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  // Get current user's employee record
  const currentEmployee = employees?.find(e => e.user_id === user?.id);

  // Check if current user is authorizer for this task
  const { data: isAuthorizer = false } = useQuery({
    queryKey: ["task-is-authorizer", taskId, currentEmployee?.id],
    queryFn: async () => {
      if (!taskId || !currentEmployee?.id) return false;
      const { data } = await supabase
        .from("task_members" as any)
        .select("id")
        .eq("task_id", taskId)
        .eq("employee_id", currentEmployee.id)
        .eq("role", "authorizer")
        .maybeSingle();
      return !!data;
    },
    enabled: !!taskId && !!currentEmployee?.id,
  });

  // Get review history for this task
  const { data: reviewHistory = [] } = useQuery({
    queryKey: ["task-review-history", taskId],
    queryFn: async () => {
      if (!taskId || !companyId) return [];
      const { data, error } = await supabase
        .from("task_review_history" as any)
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Attach reviewer names
      const employeeIds = [...new Set((data || []).map((r: any) => r.reviewer_employee_id))];
      const empMap: Record<string, string> = {};
      if (employeeIds.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", employeeIds);
        (emps || []).forEach((e: any) => { empMap[e.id] = e.name; });
      }

      return (data || []).map((r: any) => ({
        ...r,
        reviewer_name: empMap[r.reviewer_employee_id] || "Desconhecido",
      })) as TaskReviewHistoryItem[];
    },
    enabled: !!taskId && !!companyId,
  });

  const processReviewMutation = useMutation({
    mutationFn: async ({
      action,
      rejectionReason,
      comment,
    }: {
      action: "approved" | "rejected";
      rejectionReason?: RejectionReason;
      comment?: string;
    }) => {
      if (!taskId || !companyId) throw new Error("Missing task or company");

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("process-task-review", {
        body: { taskId, action, rejectionReason, comment, companyId },
      });

      if (response.error) throw new Error(response.error.message || "Failed to process review");
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["task-review-history", taskId] });

      if (variables.action === "approved") {
        toast({ title: "✅ Tarefa aprovada!", description: "A tarefa foi marcada como concluída." });
      } else {
        const reasonLabel = variables.rejectionReason ? REJECTION_REASONS[variables.rejectionReason].label : "";
        toast({
          title: "❌ Tarefa rejeitada",
          description: `Motivo: ${reasonLabel}. O responsável foi notificado.`,
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return {
    isAuthorizer,
    reviewHistory,
    processReview: processReviewMutation.mutate,
    isProcessing: processReviewMutation.isPending,
    currentEmployeeId: currentEmployee?.id,
  };
}
