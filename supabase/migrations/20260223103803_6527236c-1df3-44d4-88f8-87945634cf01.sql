-- Create trigger to auto-create internal channel when a new client is added
CREATE OR REPLACE FUNCTION public.auto_create_channel_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.internal_channels (company_id, name, channel_type, reference_id, icon)
  VALUES (NEW.company_id, NEW.name, 'client', NEW.id, '🏢')
  ON CONFLICT DO NOTHING;

  RETURN NEW;

END;

$$;


-- Create trigger on clients table
DROP TRIGGER IF EXISTS trg_auto_create_channel_for_client ON public.clients;
DROP TRIGGER IF EXISTS trg_auto_create_channel_for_client ON public.clients;
CREATE TRIGGER trg_auto_create_channel_for_client
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_channel_for_client();



-- Also update channel name when client name changes
CREATE OR REPLACE FUNCTION public.auto_update_channel_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE public.internal_channels
    SET name = NEW.name
    WHERE reference_id = NEW.id AND channel_type = 'client';

  END IF;

  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS trg_auto_update_channel_for_client ON public.clients;
DROP TRIGGER IF EXISTS trg_auto_update_channel_for_client ON public.clients;
CREATE TRIGGER trg_auto_update_channel_for_client
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_channel_for_client();
