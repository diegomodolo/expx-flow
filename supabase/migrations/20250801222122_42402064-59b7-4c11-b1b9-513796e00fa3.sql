-- Add new fields to campaigns table for better analytics
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS spend NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpa NUMERIC DEFAULT 0;

-- Update the trigger function to also calculate CPA when campaigns change
CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.clients 
    SET 
        active_campaigns = (
            SELECT COUNT(*) 
            FROM public.campaigns 
            WHERE client_id = COALESCE(NEW.client_id, OLD.client_id) 
            AND status = 'active'
        ),
        avg_cpl = (
            SELECT COALESCE(AVG(cpc), 0)
            FROM public.campaigns 
            WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
        )
    WHERE id = COALESCE(NEW.client_id, OLD.client_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;