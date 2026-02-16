import { supabase } from "@/integrations/supabase/client";

/**
 * Automatically starts or stops time tracking when a task's status changes.
 * - Moving TO 'progress': starts a new session
 * - Moving FROM 'progress': stops all active sessions
 */
export async function handleAutoTimeTracking(
  taskId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string,
  companyId?: string,
) {
  if (oldStatus === newStatus) return;

  const movingToProgress = newStatus === 'progress' && oldStatus !== 'progress';
  const movingFromProgress = oldStatus === 'progress' && newStatus !== 'progress';

  try {
    if (movingToProgress && userId && companyId) {
      await supabase.from('task_time_tracking').insert({
        task_id: taskId,
        user_id: userId,
        company_id: companyId,
      });
    } else if (movingFromProgress) {
      const { data: activeSessions } = await supabase
        .from('task_time_tracking')
        .select('id')
        .eq('task_id', taskId)
        .is('ended_at', null);

      if (activeSessions && activeSessions.length > 0) {
        await supabase
          .from('task_time_tracking')
          .update({ ended_at: new Date().toISOString() })
          .in('id', activeSessions.map(s => s.id));
      }
    }
  } catch (e) {
    console.error('Auto time tracking failed:', e);
  }
}
