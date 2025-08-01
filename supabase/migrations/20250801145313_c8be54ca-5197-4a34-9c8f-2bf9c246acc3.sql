-- Fix security issues - Update functions with proper search_path

-- Update team stats function with proper search_path
CREATE OR REPLACE FUNCTION public.update_team_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.teams 
    SET 
        active_tasks = (
            SELECT COUNT(*) 
            FROM public.tasks 
            WHERE team_id = COALESCE(NEW.team_id, OLD.team_id) 
            AND status != 'done'
        ),
        progress = (
            SELECT COALESCE(AVG(progress), 0)::INTEGER
            FROM public.tasks 
            WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
        )
    WHERE id = COALESCE(NEW.team_id, OLD.team_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update client stats function with proper search_path
CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';