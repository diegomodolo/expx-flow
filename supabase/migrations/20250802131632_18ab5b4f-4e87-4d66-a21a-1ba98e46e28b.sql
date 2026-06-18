-- Self-host: torna idempotente.
DO $$ BEGIN
  ALTER TABLE planner_daily_tasks 
  ADD CONSTRAINT unique_task_per_date 
  UNIQUE (task_id, planned_date);
EXCEPTION WHEN duplicate_table THEN null;
END $$;

INSERT INTO planner_daily_tasks (task_id, time_slot_id, planned_date, company_id)
SELECT
  'c1bdd8a4-9665-45c2-8367-a174feefbf7d',
  '4f6f6183-f397-4d7b-bb4b-5e2adcfdbe16',
  '2025-08-02'::date,
  'a50dd995-0e29-4a6f-a0a7-0f558c51818a'::uuid
WHERE EXISTS (SELECT 1 FROM tasks WHERE id = 'c1bdd8a4-9665-45c2-8367-a174feefbf7d')
  AND EXISTS (SELECT 1 FROM planner_time_slots WHERE id = '4f6f6183-f397-4d7b-bb4b-5e2adcfdbe16')
ON CONFLICT (task_id, planned_date) DO NOTHING;
