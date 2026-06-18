
-- Fix already-rejected task that has the wrong quadro_column_id (pointing to "Em Revisão" column instead of "todo")
UPDATE tasks 
SET quadro_column_id = '4ce15ae7-1049-4c4a-924f-8e1238d357fc'
WHERE id = '83d7f648-bab5-4780-88cd-e718ac5f7216'
  AND last_rejected_at IS NOT NULL
  AND status = 'todo'
  AND quadro_column_id = 'ab66402f-02ad-42b0-a6ad-8446a08b1523';