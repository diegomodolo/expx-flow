
-- Update the trigger function to use hardcoded URL and anon key (these are public values)
CREATE OR REPLACE FUNCTION public.notify_dm_agent_responder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text := 'https://ejwpfztkspbvmuwwiwmk.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ';
  request_body jsonb;
  headers jsonb;
BEGIN
  -- Skip if this message was inserted by an AI agent (avoid infinite loops)
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

  request_body := jsonb_build_object(
    'message_id', NEW.id,
    'channel_id', NEW.channel_id,
    'user_id', NEW.user_id,
    'content', NEW.content
  );

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || anon_key
  );

  BEGIN
    PERFORM net.http_post(
      supabase_url || '/functions/v1/dm-agent-responder',
      request_body,
      '{}'::jsonb,
      headers
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_dm_message_inserted ON public.internal_messages;
CREATE TRIGGER on_dm_message_inserted
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dm_agent_responder();
