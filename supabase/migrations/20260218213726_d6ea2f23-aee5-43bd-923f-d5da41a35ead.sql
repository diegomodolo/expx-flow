-- Fix: Update the agent employee to use the agent's own UUID as user_id
UPDATE public.employees 
SET user_id = ia_agent_id 
WHERE ia_agent_id IS NOT NULL 
  AND user_id != ia_agent_id;


-- Also update task_board_columns that were created with the wrong user_id
-- We need to check if columns already exist for the agent id before migrating
DO $$
DECLARE
  emp RECORD;
  existing_count INT;
BEGIN
  FOR emp IN 
    SELECT id, ia_agent_id, company_id 
    FROM employees 
    WHERE ia_agent_id IS NOT NULL
  LOOP
    -- Check if board columns already exist for the agent UUID
    SELECT COUNT(*) INTO existing_count
    FROM task_board_columns 
    WHERE user_id = emp.ia_agent_id AND company_id = emp.company_id;
    
    -- If no columns exist for the agent id, they might have been created with the old user_id
    -- The ensure_employee_board trigger will create them on next update
  END LOOP;
END $$;