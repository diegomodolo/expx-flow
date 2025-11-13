-- Fix search_path for calculate_schedule_times function
CREATE OR REPLACE FUNCTION calculate_schedule_times(executions INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  times TEXT[] := '{}';
  interval_minutes INTEGER;
  current_minutes INTEGER := 0;
  hour INTEGER;
  minute INTEGER;
BEGIN
  -- Calculate interval in minutes
  interval_minutes := (24 * 60) / executions;
  
  -- Generate array of times
  FOR i IN 1..executions LOOP
    hour := current_minutes / 60;
    minute := current_minutes % 60;
    times := array_append(times, 
      LPAD(hour::TEXT, 2, '0') || ':' || LPAD(minute::TEXT, 2, '0')
    );
    current_minutes := current_minutes + interval_minutes;
  END LOOP;
  
  RETURN times;
END;
$$;