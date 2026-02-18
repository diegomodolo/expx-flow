-- Create board columns for agent that was missing them
INSERT INTO public.task_board_columns (user_id, company_id, name, status, color, order_index)
SELECT 
  e.ia_agent_id,
  e.company_id,
  col.name,
  col.status,
  col.color,
  col.order_index
FROM employees e
CROSS JOIN (
  VALUES 
    ('A Fazer', 'todo', '#6B7280', 0),
    ('Em Andamento', 'progress', '#3B82F6', 1),
    ('Em Revisão', 'review', '#F59E0B', 2),
    ('Concluído', 'done', '#10B981', 3)
) AS col(name, status, color, order_index)
WHERE e.ia_agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_board_columns tbc 
    WHERE tbc.user_id = e.ia_agent_id AND tbc.company_id = e.company_id
  );