-- Corrigir registro de geração de criativos que ficou travado em 'in_progress'
UPDATE creative_generation_history 
SET status = 'completed', 
    execution_details = jsonb_set(
      COALESCE(execution_details, '{}'::jsonb), 
      '{completed_at}', 
      to_jsonb(now()::text)
    )
WHERE id = 'b30d93dc-3c26-4259-99af-41c6875fd5eb' 
AND status = 'in_progress';