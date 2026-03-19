import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  task_type: string | null;
  start_date: string | null;
  deadline: string | null;
  responsible_name: string | null;
  responsible_avatar: string | null;
  progress: number;
  parent_task_id: string;
}

export function useSubtasks(parentTaskId: string | null) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  // Fetch parent task to inherit properties
  const { data: parentTask } = useQuery({
    queryKey: ["parentTask", parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return null;
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "team_id, description, responsible_name, responsible_avatar, deadline, start_date, origin, priority, quadro_column_id, etapa, assigned_user_id, related_campaign_id, related_client_id, task_state",
        )
        .eq("id", parentTaskId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!parentTaskId,
  });

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ["subtasks", parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, task_type, start_date, deadline, responsible_name, responsible_avatar, progress, parent_task_id",
        )
        .eq("parent_task_id", parentTaskId)
        .neq("origin", "ghost")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!parentTaskId,
  });

  const completionPercentage =
    subtasks.length > 0
      ? Math.round(
          (subtasks.filter((s) => s.status === "done").length /
            subtasks.length) *
            100,
        )
      : 0;

  const createSubtask = useMutation({
    mutationFn: async (input: {
      title: string;
      task_type?: string;
      priority?: string;
    }) => {
      if (!parentTaskId || !companyId || !user)
        throw new Error("Dados de sessão não disponíveis");
      if (!parentTask)
        throw new Error("Tarefa pai ainda carregando. Tente novamente.");
      const row: unknown = {
        title: input.title,
        task_type: input.task_type || "Tarefa",
        priority: input.priority || parentTask.priority || "medium",
        status: "todo",
        progress: 0,
        parent_task_id: parentTaskId,
        company_id: companyId,
        user_id: user.id,
        team_id: parentTask.team_id,
        description: "",
        responsible_name: parentTask.responsible_name || "",
        responsible_avatar: parentTask.responsible_avatar || "",
        deadline: parentTask.deadline || null,
        start_date: parentTask.start_date || null,
        origin: parentTask.origin || "manual",
        assigned_user_id: parentTask.assigned_user_id || null,
        quadro_column_id: parentTask.quadro_column_id || null,
        etapa: parentTask.etapa || null,
        related_campaign_id: parentTask.related_campaign_id || null,
        related_client_id: parentTask.related_client_id || null,
        task_state: parentTask.task_state || "execucao",
      };
      const { data, error } = await supabase
        .from("tasks")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      // Ensure parent becomes História
      await supabase
        .from("tasks")
        .update({ task_type: "História" })
        .eq("id", parentTaskId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["parentTask", parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      toast.success("Subtarefa criada!");
    },
    onError: (e: Error) => toast.error(e?.message || "Erro ao criar subtarefa"),
  });

  const importRoteiro = useMutation({
    mutationFn: async (roteiroId: string) => {
      if (!parentTaskId || !companyId || !user)
        throw new Error("Dados de sessão não disponíveis");
      if (!parentTask)
        throw new Error("Tarefa pai ainda carregando. Tente novamente.");

      const { data: atividades, error } = await supabase
        .from("roteiro_atividades")
        .select("*")
        .eq("roteiro_id", roteiroId)
        .order("ordem");
      if (error) throw error;
      if (!atividades || atividades.length === 0) {
        throw new Error("Roteiro sem atividades");
      }

      const validTaskTypes = [
        "Backlog",
        "Criativo",
        "História",
        "Negócio",
        "Reunião",
        "Tarefa",
        "Ticket",
      ];
      const rows: unknown[] = atividades.map((a) => {
        const rawType = a.tipo || "Tarefa";
        const normalizedType =
          validTaskTypes.find(
            (t) => t.toLowerCase() === rawType.toLowerCase(),
          ) || "Tarefa";
        return {
          title: a.titulo,
          task_type: normalizedType,
          priority: parentTask.priority || "medium",
          status: "todo",
          progress: 0,
          parent_task_id: parentTaskId,
          company_id: companyId,
          user_id: user.id,
          team_id: parentTask.team_id,
          description: a.descricao || "",
          responsible_name: parentTask.responsible_name || "",
          responsible_avatar: parentTask.responsible_avatar || "",
          deadline: parentTask.deadline || null,
          start_date: parentTask.start_date || null,
          origin: parentTask.origin || "manual",
          assigned_user_id: parentTask.assigned_user_id || null,
          quadro_column_id: parentTask.quadro_column_id || null,
          etapa: parentTask.etapa || null,
          related_campaign_id: parentTask.related_campaign_id || null,
          related_client_id: parentTask.related_client_id || null,
          task_state: parentTask.task_state || "execucao",
        };
      });

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) throw insertError;

      // Ensure parent is marked as História (belt-and-suspenders with DB trigger)
      await supabase
        .from("tasks")
        .update({ task_type: "História" })
        .eq("id", parentTaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["parentTask", parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      toast.success("Roteiro importado com sucesso!");
    },
    onError: (e: unknown) =>
      toast.error(e?.message || "Erro ao importar roteiro"),
  });

  const updateSubtask = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      toast.success("Subtarefa removida!");
    },
    onError: () => toast.error("Erro ao remover subtarefa"),
  });

  const toggleSubtaskDone = useMutation({
    mutationFn: async (subtask: Subtask) => {
      const newStatus = subtask.status === "done" ? "todo" : "done";
      const updates: unknown = {
        status: newStatus,
        progress: newStatus === "done" ? 100 : 0,
      };
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", subtask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
    },
  });

  return {
    subtasks,
    isLoading,
    completionPercentage,
    parentTask,
    createSubtask,
    importRoteiro,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskDone,
  };
}
