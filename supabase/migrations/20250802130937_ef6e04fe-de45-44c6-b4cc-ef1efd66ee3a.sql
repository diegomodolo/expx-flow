-- Corrigir a associação da tarefa ao planner
-- Primeiro deletar associações existentes para essa tarefa
DELETE FROM planner_daily_tasks WHERE task_id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9';

-- Inserir nova associação no slot correto
INSERT INTO planner_daily_tasks (task_id, time_slot_id, planned_date, company_id)
VALUES (
  '6ada0e0b-4c99-44b4-9da5-6a42741759d9',
  '3b0936e5-a3a6-454b-a3af-e2268d1e8b02',
  '2025-08-02',
  'a50dd995-0e29-4a6f-a0a7-0f558c51818a'
);

-- Atualizar a tarefa para corrigir o horário (10:15 ao invés de 13:00)
UPDATE tasks 
SET start_date = '2025-08-02 10:15:00+00'::timestamp with time zone
WHERE id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9';