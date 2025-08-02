import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export function useUnscheduledTasks() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const {
    data: unscheduledTasks = [],
    isLoading: loading,
    error,
    refetch: fetchUnscheduledTasks,
  } = useQuery({
    queryKey: ['unscheduled-tasks', activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];
      
      // Buscar todas as tarefas sem start_date definido
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          team:teams(name, color)
        `)
        .eq("company_id", activeCompany.company_id)
        .neq("status", "done")
        .is("start_date", null)
        .order("deadline", { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;
      
      if (!tasksData || tasksData.length === 0) return [];

      // Buscar perfis dos usuários
      const userIds = [...new Set(tasksData.map(task => task.user_id).filter(Boolean))];
      
      let profilesData = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, avatar_url, full_name")
          .in("user_id", userIds);

        if (profilesError) {
          console.warn("Erro ao buscar perfis:", profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Combinar dados
      const tasksWithProfiles = tasksData.map(task => ({
        ...task,
        user_profile: profilesData.find(profile => profile.user_id === task.user_id) || null
      }));

      console.log('🔍 Unscheduled tasks found:', tasksWithProfiles.length);
      console.log('📋 Tasks:', tasksWithProfiles.map(t => ({
        id: t.id,
        title: t.title,
        user_id: t.user_id,
        deadline: t.deadline
      })));

      return tasksWithProfiles;
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  return {
    unscheduledTasks,
    loading,
    error: error as Error | null,
    fetchUnscheduledTasks,
  };
}