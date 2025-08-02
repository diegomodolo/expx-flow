-- Add start_date field to tasks table
ALTER TABLE public.tasks ADD COLUMN start_date timestamp with time zone;

-- Create function to find appropriate time slot for a given start date
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
  
  -- Find the appropriate time slot based on start time
  SELECT id INTO _time_slot_id
  FROM planner_time_slots
  WHERE company_id = _company_id
    AND is_active = true
    AND _start_time >= start_time
    AND _start_time <= end_time
  ORDER BY start_time
  LIMIT 1;
  
  RETURN _time_slot_id;
END;
$function$;

-- Create function to auto-associate task to planner when start_date is set
CREATE OR REPLACE FUNCTION public.auto_associate_task_to_planner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _time_slot_id uuid;
  _planned_date date;
BEGIN
  -- Only proceed if start_date is set and this is a new task or start_date changed
  IF NEW.start_date IS NOT NULL AND (OLD IS NULL OR OLD.start_date IS DISTINCT FROM NEW.start_date) THEN
    
    -- Find appropriate time slot
    _time_slot_id := find_time_slot_for_start_date(NEW.company_id, NEW.start_date);
    _planned_date := NEW.start_date::date;
    
    -- If we found a time slot, create or update planner entry
    IF _time_slot_id IS NOT NULL THEN
      -- Remove any existing planner entry for this task
      DELETE FROM planner_daily_tasks 
      WHERE task_id = NEW.id;
      
      -- Insert new planner entry
      INSERT INTO planner_daily_tasks (
        task_id,
        time_slot_id,
        planned_date,
        company_id
      ) VALUES (
        NEW.id,
        _time_slot_id,
        _planned_date,
        NEW.company_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-association
CREATE TRIGGER auto_associate_task_to_planner_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_associate_task_to_planner();