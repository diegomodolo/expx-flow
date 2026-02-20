
-- Create a function that calls the dm-agent-responder edge function via pg_net
-- when a new message is inserted in a DM channel
CREATE OR REPLACE FUNCTION public.trigger_dm_agent_responder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_type text;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Only act on DM channels
  SELECT channel_type INTO v_channel_type
  FROM public.internal_channels
  WHERE id = NEW.channel_id;

  IF v_channel_type != 'dm' THEN
    RETURN NEW;
  END IF;

  -- Skip if it's a system/agent message (we check in the edge function anyway)
  -- but avoid infinite loops by letting edge function handle dedup

  -- Get configuration from vault or env
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    -- Use pg_net to call the edge function
    PERFORM net.http_post(
      url := concat(
        'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/dm-agent-responder'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('supabase.anon_key', true))
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'channel_id', NEW.channel_id,
        'user_id', NEW.user_id,
        'content', NEW.content
      )::text
    );
  ELSE
    PERFORM net.http_post(
      url := concat(v_supabase_url, '/functions/v1/dm-agent-responder'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', v_service_role_key)
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'channel_id', NEW.channel_id,
        'user_id', NEW.user_id,
        'content', NEW.content
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on internal_messages
DROP TRIGGER IF EXISTS on_dm_message_inserted ON public.internal_messages;
CREATE TRIGGER on_dm_message_inserted
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_dm_agent_responder();
