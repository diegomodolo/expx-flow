-- Associar manualmente a tarefa ao slot "Retomada" (mais próximo de 13:30)
INSERT INTO planner_daily_tasks (task_id, time_slot_id, planned_date, company_id)
VALUES (
  'c1bdd8a4-9665-45c2-8367-a174feefbf7d',
  '4f6f6183-f397-4d7b-bb4b-5e2adcfdbe16', -- ID do slot "Retomada"
  '2025-08-02',
  'a50dd995-0e29-4a6f-a0a7-0f558c51818a'
)
ON CONFLICT (task_id, planned_date) DO UPDATE SET 
  time_slot_id = '4f6f6183-f397-4d7b-bb4b-5e2adcfdbe16';

-- Criar constraint única para evitar duplicatas no futuro
ALTER TABLE planner_daily_tasks 
ADD CONSTRAINT unique_task_per_date 
UNIQUE (task_id, planned_date);