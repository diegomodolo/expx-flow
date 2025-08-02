-- Corrigir o problema de Security Definer na view task_stats
DROP VIEW IF EXISTS public.task_stats;

-- Criar view sem security definer (views devem usar DEFINER por padrão para RLS)
CREATE VIEW public.task_stats AS
SELECT 
  company_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'todo') as pending_tasks,
  COUNT(*) FILTER (WHERE status = 'progress') as in_progress_tasks,
  COUNT(*) FILTER (WHERE status = 'review') as review_tasks,
  COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
  COUNT(*) FILTER (WHERE due_date < now() AND status != 'done') as overdue_tasks,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days
FROM public.tasks
GROUP BY company_id;

-- Definir politica RLS para a view
ALTER VIEW public.task_stats SET (security_invoker = true);