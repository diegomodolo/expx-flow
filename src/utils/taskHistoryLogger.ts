import { supabase } from "@/integrations/supabase/client";

/**
 * Standalone function to log automatic task history entries.
 * Can be called from anywhere without needing the useTaskHistory hook.
 */
export async function logTaskHistoryEntry(params: {
  taskId: string;
  companyId: string;
  description: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    await (supabase.from("task_history" as any) as any).insert({
      task_id: params.taskId,
      company_id: params.companyId,
      user_id: user.id,
      user_name: profile?.full_name || "Usuário",
      user_avatar: profile?.avatar_url || null,
      history_type: "automatic",
      description: params.description,
      field_changed: params.fieldChanged || null,
      old_value: params.oldValue || null,
      new_value: params.newValue || null,
    });
  } catch (err) {
    console.error("Error logging task history:", err);
  }
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'Pendente',
  progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído',
  waiting_approval: 'Aguardando Aprovação',
  blocked: 'Bloqueado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};
