-- Fix search_path security issue in handle_new_company function
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create owner membership for company creator
  INSERT INTO public.company_members (user_id, company_id, role, joined_at)
  VALUES (NEW.created_by, NEW.id, 'owner', now());
  
  RETURN NEW;
END;
$$;