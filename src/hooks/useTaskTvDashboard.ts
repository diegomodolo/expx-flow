import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface ActiveSession {
  session_id: string;
  task_id: string;
  task_title: string;
  task_priority: string;
  task_deadline: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  started_at: string;
}

export interface CollaboratorRanking {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  in_progress_tasks: number;
  regularity: number; // % tasks on time
  quality: number;    // % tasks done without overdue
  efficiency: number; // combined score
  score: number;      // weighted final score
}

export interface TaskTvData {
  openTasks: number;
  overdueTasks: number;
  completedToday: number;
  executingNow: number;
  regularity: number;
  quality: number;
  efficiency: number;
  activeSessions: ActiveSession[];
  rankings: CollaboratorRanking[];
  lastSync: Date;
}

export function useTaskTvDashboard(refreshMs = 30_000) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-tv-dashboard', activeCompany?.company_id],
    queryFn: async (): Promise<TaskTvData> => {
      const companyId = activeCompany?.company_id;
      if (!companyId) throw new Error('No company');

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all tasks for company (excluding done/cancelled)
      const [tasksRes, activeSessionsRes, weekTasksRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, deadline, due_date, responsible_name, responsible_avatar, assigned_user_id, user_id')
          .eq('company_id', companyId)
          .neq('status', 'cancelled'),
        supabase
          .from('task_time_tracking')
          .select('id, task_id, user_id, started_at')
          .eq('company_id', companyId)
          .is('ended_at', null),
        supabase
          .from('tasks')
          .select('id, title, status, priority, deadline, due_date, assigned_user_id, user_id, created_at')
          .eq('company_id', companyId)
          .gte('created_at', weekAgo),
      ]);

      const tasks = tasksRes.data || [];
      const rawSessions = activeSessionsRes.data || [];
      const weekTasks = weekTasksRes.data || [];

      // --- KPIs ---
      const openTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length;
      const overdueTasks = tasks.filter(t => {
        if (['done', 'cancelled'].includes(t.status)) return false;
        const deadline = t.due_date || t.deadline;
        return deadline && new Date(deadline) < now;
      }).length;

      // Completed today
      const completedTodayRes = await supabase
        .from('tasks')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'done')
        .gte('updated_at', todayStart);
      const completedToday = (completedTodayRes.data || []).length;

      const executingNow = rawSessions.length;

      // --- Indicators ---
      const onTime = tasks.filter(t => {
        if (['done', 'cancelled'].includes(t.status)) return false;
        const deadline = t.due_date || t.deadline;
        return !deadline || new Date(deadline) >= now;
      }).length;
      const regularity = openTasks > 0 ? Math.round((onTime / openTasks) * 100) : 100;

      const doneTasks = tasks.filter(t => t.status === 'done');
      const doneOnTime = doneTasks.filter(t => {
        const deadline = t.due_date || t.deadline;
        return !deadline; // no deadline = on time
      }).length;
      const quality = doneTasks.length > 0 ? Math.round(((doneTasks.length - (doneTasks.length - doneOnTime)) / doneTasks.length) * 100) : 100;

      const efficiency = Math.round((regularity + quality) / 2);

      // --- Active sessions with user info ---
      const sessionUserIds = [...new Set(rawSessions.map(s => s.user_id))];
      const sessionTaskIds = [...new Set(rawSessions.map(s => s.task_id))];

      const [profilesRes, sessionTasksRes] = await Promise.all([
        sessionUserIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', sessionUserIds)
          : Promise.resolve({ data: [] }),
        sessionTaskIds.length > 0
          ? supabase.from('tasks').select('id, title, priority, deadline, due_date').in('id', sessionTaskIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const taskMap = new Map((sessionTasksRes.data || []).map((t: any) => [t.id, t]));

      const activeSessions: ActiveSession[] = rawSessions.map(s => {
        const profile = profileMap.get(s.user_id) as any;
        const task = taskMap.get(s.task_id) as any;
        return {
          session_id: s.id,
          task_id: s.task_id,
          task_title: task?.title || 'Tarefa',
          task_priority: task?.priority || 'medium',
          task_deadline: task?.due_date || task?.deadline || null,
          user_id: s.user_id,
          user_name: profile?.full_name || 'Colaborador',
          user_avatar: profile?.avatar_url || null,
          started_at: s.started_at,
        };
      });

      // --- Rankings (last 7 days) ---
      const allUserIds = [...new Set([
        ...weekTasks.map(t => t.assigned_user_id || t.user_id).filter(Boolean),
      ])] as string[];

      let rankings: CollaboratorRanking[] = [];
      if (allUserIds.length > 0) {
        const { data: rankProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', allUserIds);

        const rankProfileMap = new Map((rankProfiles || []).map((p: any) => [p.user_id, p]));

        rankings = allUserIds.map(uid => {
          const userTasks = weekTasks.filter(t => (t.assigned_user_id || t.user_id) === uid);
          const total = userTasks.length;
          const completed = userTasks.filter(t => t.status === 'done').length;
          const overdue = userTasks.filter(t => {
            const dl = t.due_date || t.deadline;
            return dl && new Date(dl) < now && t.status !== 'done';
          }).length;
          const inProgress = userTasks.filter(t => t.status === 'progress').length;
          const regularity = total > 0 ? Math.round(((total - overdue) / total) * 100) : 0;
          const quality = total > 0 ? Math.round((completed / total) * 100) : 0;
          const efficiency = total > 0 ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0;
          const score = Math.round((regularity * 0.4 + quality * 0.4 + efficiency * 0.2));

          const profile = rankProfileMap.get(uid) as any;
          return {
            user_id: uid,
            user_name: profile?.full_name || 'Colaborador',
            user_avatar: profile?.avatar_url || null,
            total_tasks: total,
            completed_tasks: completed,
            overdue_tasks: overdue,
            in_progress_tasks: inProgress,
            regularity,
            quality,
            efficiency,
            score,
          };
        }).filter(r => r.total_tasks > 0).sort((a, b) => b.score - a.score);
      }

      return {
        openTasks,
        overdueTasks,
        completedToday,
        executingNow,
        regularity,
        quality,
        efficiency,
        activeSessions,
        rankings,
        lastSync: new Date(),
      };
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: refreshMs,
    staleTime: 10_000,
  });

  // Supabase realtime for instant updates on task_time_tracking changes
  useEffect(() => {
    if (!activeCompany?.company_id) return;
    const channel = supabase
      .channel('task-tv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_time_tracking' }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-tv-dashboard', activeCompany.company_id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-tv-dashboard', activeCompany.company_id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeCompany?.company_id, queryClient]);

  return query;
}
