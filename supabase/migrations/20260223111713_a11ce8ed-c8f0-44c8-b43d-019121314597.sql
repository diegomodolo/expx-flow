-- Fix the auto_post_task_to_channel function to cast team_id to text
-- The reference_id column in internal_channels is TEXT but team_id is UUID
CREATE OR REPLACE FUNCTION public.auto_post_task_to_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel_id UUID;
  v_bot_user_id UUID := '00000000-0000-0000-0000-000000000000';
  v_task_msg TEXT;
BEGIN
  -- Only on new tasks with a team_id
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the squad channel for this team (cast uuid to text for comparison)
  SELECT id INTO v_channel_id
  FROM public.internal_channels
  WHERE reference_id = NEW.team_id::TEXT
    AND channel_type = 'squad'
  LIMIT 1;

  IF v_channel_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build message
  v_task_msg := '📋 Nova tarefa criada: **' || COALESCE(NEW.title, 'Sem título') || '**'
    || CASE WHEN NEW.responsible_name IS NOT NULL THEN E'\n👤 Responsável: ' || NEW.responsible_name ELSE '' END
    || CASE WHEN NEW.deadline IS NOT NULL THEN E'\n📅 Prazo: ' || NEW.deadline::TEXT ELSE '' END
    || E'\n🔗 #' || NEW.id::TEXT;

  INSERT INTO public.internal_messages (channel_id, user_id, content, task_reference_id)
  VALUES (v_channel_id, COALESCE(auth.uid(), v_bot_user_id), v_task_msg, NEW.id);

  RETURN NEW;
END;
$$;