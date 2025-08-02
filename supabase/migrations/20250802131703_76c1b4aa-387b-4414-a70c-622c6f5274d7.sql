-- Melhorar a função para encontrar o slot mais próximo quando não há match exato
CREATE OR REPLACE FUNCTION public.find_time_slot_for_start_date(
  _company_id uuid,
  _start_date timestamp with time zone
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _time_slot_id uuid;
  _start_time time;
BEGIN
  -- Extract time from start_date
  _start_time := _start_date::time;
  
  -- Primeiro: tentar encontrar slot exato (onde o horário está dentro do range)
  SELECT id INTO _time_slot_id
  FROM planner_time_slots
  WHERE company_id = _company_id
    AND is_active = true
    AND _start_time >= start_time
    AND _start_time <= end_time
  ORDER BY start_time
  LIMIT 1;
  
  -- Se não encontrou slot exato, encontrar o mais próximo
  IF _time_slot_id IS NULL THEN
    -- Buscar o próximo slot que começaria depois do horário
    SELECT id INTO _time_slot_id
    FROM planner_time_slots
    WHERE company_id = _company_id
      AND is_active = true
      AND start_time > _start_time
    ORDER BY start_time
    LIMIT 1;
    
    -- Se ainda não encontrou, pegar o último slot do dia
    IF _time_slot_id IS NULL THEN
      SELECT id INTO _time_slot_id
      FROM planner_time_slots
      WHERE company_id = _company_id
        AND is_active = true
      ORDER BY end_time DESC
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN _time_slot_id;
END;
$function$;