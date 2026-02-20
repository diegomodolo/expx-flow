
-- Drop and recreate the trigger function with correct pg_net call
-- The trigger will pass the service role key in the Authorization header
CREATE OR REPLACE FUNCTION public.notify_dm_agent_responder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_key text;
  request_body jsonb;
  headers jsonb;
BEGIN
  -- Skip if this message was inserted by an agent (avoid infinite loops)
  -- Check if user_id belongs to an AI agent
  IF EXISTS (
    SELECT 1 FROM public.ia_agents 
    WHERE id = NEW.user_id AND is_collaborator = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Only process DM channels
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_channels
    WHERE id = NEW.channel_id AND channel_type = 'dm'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RETURN NEW;
  END IF;

  request_body := jsonb_build_object(
    'message_id', NEW.id,
    'channel_id', NEW.channel_id,
    'user_id', NEW.user_id,
    'content', NEW.content
  );

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_key
  );

  BEGIN
    PERFORM net.http_post(
      supabase_url || '/functions/v1/dm-agent-responder',
      request_body,
      '{}'::jsonb,
      headers
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block the message insert
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on internal_messages
DROP TRIGGER IF EXISTS on_dm_message_inserted ON public.internal_messages;

CREATE TRIGGER on_dm_message_inserted
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dm_agent_responder();
