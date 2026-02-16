import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TaskMemberRole = 'responsible' | 'contributor' | 'observer';

export interface TaskMember {
  id: string;
  task_id: string;
  employee_id: string;
  role: TaskMemberRole;
  company_id: string;
  created_at: string;
  employee_name?: string;
  employee_avatar?: string;
}

export function useTaskMembers(taskId: string | undefined, companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['task-members', taskId],
    queryFn: async () => {
      if (!taskId || !companyId) return [];
      
      // First get task_members
      const { data, error } = await supabase
        .from('task_members' as any)
        .select('*, employees:employee_id(name, avatar, user_id)')
        .eq('task_id', taskId)
        .eq('company_id', companyId);
      if (error) throw error;
      
      // Get profile avatars for all members
      const userIds = (data || []).map((m: any) => m.employees?.user_id).filter(Boolean);
      let profileAvatars: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            if (p.avatar_url) profileAvatars[p.user_id] = p.avatar_url;
          });
        }
      }
      
      return (data || []).map((m: any) => ({
        id: m.id,
        task_id: m.task_id,
        employee_id: m.employee_id,
        role: m.role as TaskMemberRole,
        company_id: m.company_id,
        created_at: m.created_at,
        employee_name: m.employees?.name || '',
        employee_avatar: m.employees?.avatar || profileAvatars[m.employees?.user_id] || null,
      })) as TaskMember[];
    },
    enabled: !!taskId && !!companyId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ employeeId, role }: { employeeId: string; role: TaskMemberRole }) => {
      if (!taskId || !companyId) throw new Error('Missing task/company');
      const { data, error } = await supabase
        .from('task_members' as any)
        .insert({ task_id: taskId, employee_id: employeeId, role, company_id: companyId })
        .select('*, employees:employee_id(name, avatar)')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ employeeId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['task-members', taskId] });
      const previous = queryClient.getQueryData(['task-members', taskId]);
      queryClient.setQueryData(['task-members', taskId], (old: TaskMember[] | undefined) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          task_id: taskId!,
          employee_id: employeeId,
          role,
          company_id: companyId!,
          created_at: new Date().toISOString(),
          employee_name: 'Carregando...',
          employee_avatar: null,
        } as TaskMember,
      ]);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-members', taskId] });
      toast({ title: 'Membro adicionado!' });
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['task-members', taskId], context.previous);
      }
      if (err.message?.includes('idx_task_members_responsible')) {
        toast({ title: 'Erro', description: 'Já existe um responsável para esta tarefa.', variant: 'destructive' });
      } else if (err.message?.includes('idx_task_members_unique')) {
        toast({ title: 'Erro', description: 'Este membro já possui esse papel nesta tarefa.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      }
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: TaskMemberRole }) => {
      const { error } = await supabase
        .from('task_members' as any)
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-members', taskId] });
      toast({ title: 'Papel atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_members' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-members', taskId] });
      toast({ title: 'Membro removido!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const responsible = members.find(m => m.role === 'responsible');
  const contributors = members.filter(m => m.role === 'contributor');
  const observers = members.filter(m => m.role === 'observer');

  return {
    members,
    responsible,
    contributors,
    observers,
    isLoading,
    addMember: addMemberMutation.mutate,
    isAdding: addMemberMutation.isPending,
    updateRole: updateRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isRemoving: removeMemberMutation.isPending,
  };
}
