-- Create board columns for AI agent employees that are missing them
DO $$
DECLARE
  emp RECORD;
  existing_count INT;
  default_columns TEXT[] := ARRAY['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído'];
  default_statuses TEXT[] := ARRAY['todo', 'progress', 'review', 'done'];
  default_colors TEXT[] := ARRAY['#6B7280', '#3B82F6', '#F59E0B', '#10B981'];
  i INT;
BEGIN
  FOR emp IN 
    SELECT user_id, company_id FROM employees 
    WHERE ia_agent_id IS NOT NULL AND status = 'active' AND user_id IS NOT NULL
  LOOP
    SELECT COUNT(*) INTO existing_count
    FROM task_board_columns
    WHERE user_id = emp.user_id AND company_id = emp.company_id;

    IF existing_count = 0 THEN
      FOR i IN 1..array_length(default_columns, 1) LOOP
        INSERT INTO task_board_columns (user_id, company_id, name, status, color, order_index)
        VALUES (emp.user_id, emp.company_id, default_columns[i], default_statuses[i], default_colors[i], i - 1);
      END LOOP;
    END IF;
  END LOOP;
END $$;