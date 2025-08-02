-- Adicionar foreign keys para relacionamentos
ALTER TABLE public.planner_daily_tasks
ADD CONSTRAINT fk_planner_daily_tasks_task_id 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.planner_daily_tasks
ADD CONSTRAINT fk_planner_daily_tasks_time_slot_id 
FOREIGN KEY (time_slot_id) REFERENCES public.planner_time_slots(id) ON DELETE CASCADE;

ALTER TABLE public.planner_daily_tasks
ADD CONSTRAINT fk_planner_daily_tasks_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.planner_time_slots
ADD CONSTRAINT fk_planner_time_slots_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.client_rotations
ADD CONSTRAINT fk_client_rotations_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.optimization_history
ADD CONSTRAINT fk_optimization_history_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.optimization_history
ADD CONSTRAINT fk_optimization_history_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.optimization_history
ADD CONSTRAINT fk_optimization_history_task_id 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;