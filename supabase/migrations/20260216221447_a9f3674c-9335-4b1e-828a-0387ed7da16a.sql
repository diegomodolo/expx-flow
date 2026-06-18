DROP TRIGGER IF EXISTS trigger_task_flow_automation ON public.tasks;
CREATE TRIGGER trigger_task_flow_automation
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.execute_task_flow_automation();
