-- Trigger: auto-create internal channel when a new team (squad) is created
CREATE OR REPLACE FUNCTION public.auto_create_channel_for_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.internal_channels (company_id, name, channel_type, reference_id, icon)
  VALUES (NEW.company_id, NEW.name, 'squad', NEW.id, '👥')
  ON CONFLICT DO NOTHING;

  RETURN NEW;

END;

$$;
DROP TRIGGER IF EXISTS trg_auto_create_channel_for_team ON public.teams;
CREATE TRIGGER trg_auto_create_channel_for_team
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_channel_for_team();



-- Also sync name changes
CREATE OR REPLACE FUNCTION public.auto_update_channel_for_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE public.internal_channels
    SET name = NEW.name
    WHERE reference_id = NEW.id AND channel_type = 'squad';

  END IF;

  RETURN NEW;

END;

$$;
DROP TRIGGER IF EXISTS trg_auto_update_channel_for_team ON public.teams;
CREATE TRIGGER trg_auto_update_channel_for_team
AFTER UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_channel_for_team();



-- Backfill: create channels for any existing squads that don't have one yet
INSERT INTO public.internal_channels (company_id, name, channel_type, reference_id, icon)
SELECT t.company_id, t.name, 'squad', t.id, '👥'
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.internal_channels ic
  WHERE ic.reference_id = t.id AND ic.channel_type = 'squad'
);