import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Task } from "./useTasks";
import { useEmployeePermissions } from "./useEmployeePermissions";

export function useEmployeeBoard(selectedUserId?: string | null | "all") {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { hasPermission, isOwner, permissionsLoading } = useEmployeePermissions();

  // Query para verificar se o usuário é owner/admin
  const {
    data: isManager,
    isLoading: managerLoading,
  } = useQuery({
    queryKey: ['is-manager', user?.id, activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return false;

      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", activeCompany.company_id)
        .single();

      if (error) return false;
      return ['owner', 'admin'].includes(data?.role || '');
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Query para buscar tarefas do quadro selecionado
  const {
    data: boardTasks = [],
    isLoading: tasksLoading,
    refetch: refetchBoardTasks,
  } = useQuery({
    queryKey: ['board-tasks', activeCompany?.company_id, selectedUserId],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      const today = new Date().toISOString().split('T')[0];

      // Buscar tarefas atribuídas ao usuário
      let query = supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      // Se for "all", buscar todas as tarefas da empresa
      // Se for um userId específico, filtrar por esse usuário
      // Se for null, buscar as do usuário atual
      if (selectedUserId !== "all") {
        const targetUserId = selectedUserId || user.id;
        query = query.or(`user_id.eq.${targetUserId},assigned_user_id.eq.${targetUserId}`);
      }

      const { data: tasksData, error: tasksError } = await query;

      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) return [];

      // Buscar colunas do quadro do usuário alvo para filtrar tarefas de outros quadros
      const targetUserId2 = selectedUserId === "all" ? null : (selectedUserId || user.id);
      let userColumnIds: Set<string> = new Set();
      if (targetUserId2) {
        const { data: userCols } = await supabase
          .from("task_board_columns")
          .select("id")
          .eq("user_id", targetUserId2)
          .eq("company_id", activeCompany.company_id);
        userColumnIds = new Set((userCols || []).map(c => c.id));
      }

      // Filtrar tarefas que já estão visíveis (visibility_date <= hoje ou null)
      // Excluir Histórias (tarefas-pai) do Kanban — só subtarefas aparecem
      // Excluir tarefas que estão no quadro de outro usuário
      const visibleTasks = tasksData.filter(task => {
        if (task.task_type === 'História') return false;
        if (!task.visibility_date ? false : task.visibility_date > today) return false;
        // Se a tarefa tem quadro_column_id definido e pertence a outro quadro, excluir
        if (task.quadro_column_id && targetUserId2 && userColumnIds.size > 0) {
          if (!userColumnIds.has(task.quadro_column_id)) return false;
        }
        return true;
      });

      // Buscar perfis dos usuários
      const userIds = [...new Set(visibleTasks.map(task => task.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, avatar_url, full_name")
        .in("user_id", userIds);

      // Buscar clientes relacionados
      const clientIds = [...new Set(visibleTasks.map(task => task.related_client_id).filter(Boolean))];
      let clientsData: unknown[] = [];
      if (clientIds.length > 0) {
        const { data } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientsData = data || [];
      }

      // Combinar dados
      return visibleTasks.map(task => ({
        ...task,
        user_profile: profilesData?.find(profile => profile.user_id === task.user_id) || null,
        client: task.related_client_id ? clientsData.find(client => client.id === task.related_client_id) || null : null,
      })) as Task[];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Query para listar colaboradores (para o seletor de quadro)
  const {
    data: employees = [],
    isLoading: employeesLoading,
  } = useQuery({
    queryKey: ['board-employees', activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("id, user_id, name, avatar, role")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Verificar se pode ver quadros de outros - usa a permissão do sistema
  const canViewOthersBoards = isOwner || isManager || hasPermission('ver-quadros-outros');

  // Subscribe to realtime changes on tasks table for auto-refresh
  useEffect(() => {
    if (!activeCompany?.company_id) return;

    const channel = supabase
      .channel('board-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `company_id=eq.${activeCompany.company_id}`,
        },
        () => {
          // Debounce: invalidate after a short delay to batch rapid changes
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['board-tasks', activeCompany.company_id, selectedUserId] });
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.company_id, selectedUserId, queryClient]);

  return {
    boardTasks,
    tasksLoading,
    refetchBoardTasks,
    employees,
    employeesLoading,
    canViewOthersBoards,
    isManager: isManager || false,
    permissionLoading: permissionsLoading || managerLoading,
    currentUserId: user?.id,
  };
}
