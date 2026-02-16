import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export interface TimeTrackingSession {
  id: string;
  task_id: string;
  user_id: string;
  company_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export function useTaskTimeTracking(taskId: string | null) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ['task-time-tracking', taskId];

  const { data: sessions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_time_tracking')
        .select('*')
        .eq('task_id', taskId)
        .order('started_at', { ascending: false });
      if (error) throw error;

      // Fetch user names from profiles
      const userIds = [...new Set((data || []).map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])
      );

      return (data || []).map(s => ({
        ...s,
        user_name: profileMap.get(s.user_id)?.name || 'Usuário',
        user_avatar: profileMap.get(s.user_id)?.avatar || null,
      })) as TimeTrackingSession[];
    },
    enabled: !!taskId,
  });

  const activeSession = sessions.find(s => !s.ended_at && s.user_id === user?.id);
  const anyActiveSession = sessions.find(s => !s.ended_at);

  const totalMinutes = sessions.reduce((acc, s) => {
    if (s.duration_minutes) return acc + Number(s.duration_minutes);
    if (!s.ended_at) {
      // Calculate live duration for active sessions
      const start = new Date(s.started_at).getTime();
      const now = Date.now();
      return acc + (now - start) / 60000;
    }
    return acc;
  }, 0);

  const startTracking = useMutation({
    mutationFn: async () => {
      if (!taskId || !user?.id || !activeCompany?.company_id) throw new Error('Missing data');
      const { error } = await supabase.from('task_time_tracking').insert({
        task_id: taskId,
        user_id: user.id,
        company_id: activeCompany.company_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Timer iniciado' });
    },
    onError: () => {
      toast({ title: 'Erro ao iniciar timer', variant: 'destructive' });
    },
  });

  const stopTracking = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('task_time_tracking')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Timer parado' });
    },
    onError: () => {
      toast({ title: 'Erro ao parar timer', variant: 'destructive' });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('task_time_tracking')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Sessão removida' });
    },
  });

  const createManualSession = useMutation({
    mutationFn: async (data: { user_id: string; started_at: string; ended_at: string }) => {
      if (!taskId || !activeCompany?.company_id) throw new Error('Missing data');
      const { error } = await supabase.from('task_time_tracking').insert({
        task_id: taskId,
        user_id: data.user_id,
        company_id: activeCompany.company_id,
        started_at: data.started_at,
        ended_at: data.ended_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Sessão adicionada' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar sessão', variant: 'destructive' });
    },
  });

  const updateSession = useMutation({
    mutationFn: async (data: { sessionId: string; started_at: string; ended_at: string; user_id?: string }) => {
      const updates: any = { started_at: data.started_at, ended_at: data.ended_at };
      if (data.user_id) updates.user_id = data.user_id;
      const { error } = await supabase
        .from('task_time_tracking')
        .update(updates)
        .eq('id', data.sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Sessão atualizada' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar sessão', variant: 'destructive' });
    },
  });

  return {
    sessions,
    isLoading,
    activeSession,
    anyActiveSession,
    totalMinutes,
    startTracking,
    stopTracking,
    deleteSession,
    createManualSession,
    updateSession,
  };
}
