import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  company_id: string;
  user_id: string | null;
  user_name: string | null;
  user_avatar: string | null;
  history_type: "automatic" | "manual";
  description: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export function useTaskHistory(taskId: string | null) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const fetchHistory = useCallback(async () => {
    if (!taskId || !companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("task_history" as any)
      .select("*")
      .eq("task_id", taskId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setEntries((data as any as TaskHistoryEntry[]) || []);
    setLoading(false);
  }, [taskId, companyId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addManualEntry = async (description: string) => {
    if (!taskId || !companyId || !user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    await (supabase.from("task_history" as any) as any).insert({
      task_id: taskId,
      company_id: companyId,
      user_id: user.id,
      user_name: profile?.full_name || "Usuário",
      user_avatar: profile?.avatar_url || null,
      history_type: "manual",
      description,
    });
    await fetchHistory();
  };

  const updateEntry = async (entryId: string, description: string) => {
    await (supabase.from("task_history" as any) as any)
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    await fetchHistory();
  };

  const deleteEntry = async (entryId: string) => {
    await (supabase.from("task_history" as any) as any)
      .delete()
      .eq("id", entryId);
    await fetchHistory();
  };

  const logAutomatic = async (
    taskId: string,
    description: string,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    if (!companyId || !user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    await (supabase.from("task_history" as any) as any).insert({
      task_id: taskId,
      company_id: companyId,
      user_id: user.id,
      user_name: profile?.full_name || "Usuário",
      user_avatar: profile?.avatar_url || null,
      history_type: "automatic",
      description,
      field_changed: fieldChanged || null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  };

  return { entries, loading, addManualEntry, updateEntry, deleteEntry, logAutomatic, refetch: fetchHistory };
}
