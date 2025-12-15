-- Fix search_path for the function created in this migration
CREATE OR REPLACE FUNCTION public.update_lead_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;