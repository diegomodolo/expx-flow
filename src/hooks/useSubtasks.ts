import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

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

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['subtasks', parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, task_type, start_date, deadline, responsible_name, responsible_avatar, progress, parent_task_id')
        .eq('parent_task_id', parentTaskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!parentTaskId,
  });

  const completionPercentage = subtasks.length > 0
    ? Math.round((subtasks.filter(s => s.status === 'done').length / subtasks.length) * 100)
    : 0;

  const createSubtask = useMutation({
    mutationFn: async (input: { title: string; task_type?: string; priority?: string }) => {
      if (!parentTaskId || !companyId || !user) throw new Error('Missing context');
      const row: any = {
        title: input.title,
        task_type: input.task_type || 'Tarefa',
        priority: input.priority || 'medium',
        status: 'todo',
        progress: 0,
        parent_task_id: parentTaskId,
        company_id: companyId,
        user_id: user.id,
        team_id: null,
        description: '',
        responsible_name: null,
        responsible_avatar: null,
        deadline: null,
        start_date: null,
        origin: 'manual',
      };
      const { data, error } = await supabase
        .from('tasks')
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      toast.success('Subtarefa criada!');
    },
    onError: () => toast.error('Erro ao criar subtarefa'),
  });

  const importRoteiro = useMutation({
    mutationFn: async (roteiroId: string) => {
      if (!parentTaskId || !companyId || !user) throw new Error('Missing context');
      
      const { data: atividades, error } = await supabase
        .from('roteiro_atividades')
        .select('*')
        .eq('roteiro_id', roteiroId)
        .order('ordem');
      if (error) throw error;
      if (!atividades || atividades.length === 0) {
        throw new Error('Roteiro sem atividades');
      }

      const rows: any[] = atividades.map(a => ({
        title: a.titulo,
        task_type: a.tipo || 'Tarefa',
        priority: 'medium',
        status: 'todo',
        progress: 0,
        parent_task_id: parentTaskId,
        company_id: companyId,
        user_id: user.id,
        team_id: null,
        description: a.descricao || '',
        responsible_name: null,
        responsible_avatar: null,
        deadline: null,
        start_date: null,
        origin: 'manual',
      }));

      const { error: insertError } = await supabase.from('tasks').insert(rows);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      toast.success('Roteiro importado com sucesso!');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao importar roteiro'),
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      toast.success('Subtarefa removida!');
    },
    onError: () => toast.error('Erro ao remover subtarefa'),
  });

  const toggleSubtaskDone = useMutation({
    mutationFn: async (subtask: Subtask) => {
      const newStatus = subtask.status === 'done' ? 'todo' : 'done';
      const updates: any = { status: newStatus, progress: newStatus === 'done' ? 100 : 0 };
      const { error } = await supabase.from('tasks').update(updates).eq('id', subtask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
    },
  });

  return {
    subtasks,
    isLoading,
    completionPercentage,
    createSubtask,
    importRoteiro,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskDone,
  };
}
