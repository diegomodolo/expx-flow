-- Self-host: migration legada de fix de dados do dev. Tornada idempotente.
DELETE FROM planner_daily_tasks
WHERE task_id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9'
  AND EXISTS (SELECT 1 FROM tasks WHERE id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9');

INSERT INTO planner_daily_tasks (task_id, time_slot_id, planned_date, company_id)
SELECT
  '6ada0e0b-4c99-44b4-9da5-6a42741759d9',
  '3b0936e5-a3a6-454b-a3af-e2268d1e8b02',
  '2025-08-02'::date,
  'a50dd995-0e29-4a6f-a0a7-0f558c51818a'::uuid
WHERE EXISTS (SELECT 1 FROM tasks WHERE id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9');

UPDATE tasks 
SET start_date = '2025-08-02 10:15:00+00'::timestamp with time zone
WHERE id = '6ada0e0b-4c99-44b4-9da5-6a42741759d9';
