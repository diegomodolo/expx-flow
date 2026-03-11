import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface TaskAwaitingApproval {
  id: string;
  title: string;
  client_name: string | null;
  submitted_by: string | null;
  updated_at: string;
}

export function useTasksAwaitingApproval() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-awaiting-approval", companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user?.id) return [];

      // 0. Get current employee ID directly (avoid useEmployees timing issues)
      const { data: empData } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!empData?.id) return [];

      // 1. Get task IDs where current user is authorizer
      const { data: memberRows, error: memberError } = await supabase
        .from("task_members" as unknown)
        .select("task_id")
        .eq("employee_id", empData.id)
        .eq("role", "authorizer");

      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) return [];

      const taskIds = memberRows.map((r: { task_id: string }) => r.task_id);

      // 2. Get tasks in review status from those IDs
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, client_id, updated_at")
        .eq("company_id", companyId)
        .eq("status", "review")
        .in("id", taskIds)
        .order("updated_at", { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) return [];

      // 3. Get client names
      const clientIds = [...new Set(tasksData.filter(t => t.client_id).map(t => t.client_id))];
      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);
        (clients || []).forEach((c: { id: string; company_name: string }) => {
          clientMap[c.id] = c.company_name;
        });
      }

      // 4. Get who moved to review (responsible member)
      const { data: responsibleRows } = await supabase
        .from("task_members" as unknown)
        .select("task_id, employee_id")
        .in("task_id", taskIds)
        .eq("role", "responsible");

      const responsibleMap: Record<string, string> = {};
      if (responsibleRows && responsibleRows.length > 0) {
        const empIds = [...new Set(responsibleRows.map((r: { employee_id: string }) => r.employee_id))];
        const { data: emps } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", empIds);
        const empNameMap: Record<string, string> = {};
        (emps || []).forEach((e: { id: string; name: string }) => { empNameMap[e.id] = e.name; });
        responsibleRows.forEach((r: { task_id: string; employee_id: string }) => {
          responsibleMap[r.task_id] = empNameMap[r.employee_id] || null;
        });
      }

      return tasksData.map(t => ({
        id: t.id,
        title: t.title,
        client_name: t.client_id ? (clientMap[t.client_id] || null) : null,
        submitted_by: responsibleMap[t.id] || null,
        updated_at: t.updated_at,
      })) as TaskAwaitingApproval[];
    },
    enabled: !!companyId && !!user?.id,
    refetchInterval: 30000,
  });

  return { tasks, count: tasks.length, isLoading };
}
