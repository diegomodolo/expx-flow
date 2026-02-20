
-- Fix the dm message trigger: correct pg_net signature and add exception handling
-- The error was: function net.http_post(url => text, headers => jsonb, body => text) does not exist
-- pg_net uses positional params and body must be jsonb

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
BEGIN
  -- Only process if pg_net is available, otherwise skip silently
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := NULL;
  END;

  -- Build the request body as jsonb
  request_body := jsonb_build_object(
    'message_id', NEW.id,
    'channel_id', NEW.channel_id,
    'user_id', NEW.user_id,
    'content', NEW.content
  );

  -- Try to call the edge function via pg_net with correct positional signature
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM net.http_post(
        supabase_url || '/functions/v1/dm-agent-responder',
        request_body,
        '{}'::jsonb,
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block the message insert if the notification fails
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to make sure it uses the updated function
DROP TRIGGER IF EXISTS on_dm_message_inserted ON public.internal_messages;

CREATE TRIGGER on_dm_message_inserted
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dm_agent_responder();
