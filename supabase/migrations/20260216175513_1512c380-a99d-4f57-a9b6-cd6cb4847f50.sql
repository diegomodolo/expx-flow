
-- Fix the function to use correct status values
CREATE OR REPLACE FUNCTION public.ensure_employee_board()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_columns TEXT[] := ARRAY['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído'];
  default_statuses TEXT[] := ARRAY['todo', 'progress', 'review', 'done'];
  default_colors TEXT[] := ARRAY['#6B7280', '#3B82F6', '#F59E0B', '#10B981'];
  i INT;
  existing_count INT;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO existing_count
  FROM task_board_columns
  WHERE user_id = NEW.user_id AND company_id = NEW.company_id;

  IF existing_count = 0 THEN
    FOR i IN 1..array_length(default_columns, 1) LOOP
      INSERT INTO task_board_columns (user_id, company_id, name, status, color, order_index)
      VALUES (NEW.user_id, NEW.company_id, default_columns[i], default_statuses[i], default_colors[i], i - 1);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill with correct status values
DO $$
DECLARE
  emp RECORD;
  default_columns TEXT[] := ARRAY['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído'];
  default_statuses TEXT[] := ARRAY['todo', 'progress', 'review', 'done'];
  default_colors TEXT[] := ARRAY['#6B7280', '#3B82F6', '#F59E0B', '#10B981'];
  existing_count INT;
  i INT;
BEGIN
  FOR emp IN 
    SELECT DISTINCT e.user_id, e.company_id
    FROM employees e
    WHERE e.status = 'active' AND e.user_id IS NOT NULL
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
END;
$$;
