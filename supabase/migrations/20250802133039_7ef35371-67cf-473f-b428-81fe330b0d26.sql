-- Modificar a função handle_new_company para também criar o colaborador automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile_name text;
  _user_email text;
BEGIN
  -- Create owner membership for company creator
  INSERT INTO public.company_members (user_id, company_id, role, joined_at)
  VALUES (NEW.created_by, NEW.id, 'owner', now());
  
  -- Get user profile data
  SELECT full_name INTO _profile_name
  FROM public.profiles 
  WHERE user_id = NEW.created_by;
  
  -- Get user email from auth.users (using raw_user_meta_data)
  SELECT 
    COALESCE(raw_user_meta_data ->> 'email', email) INTO _user_email
  FROM auth.users 
  WHERE id = NEW.created_by;
  
  -- Create employee record for the company owner
  INSERT INTO public.employees (
    user_id,
    company_id,
    name,
    email,
    role,
    status,
    start_date
  ) VALUES (
    NEW.created_by,
    NEW.id,
    COALESCE(_profile_name, 'Proprietário'),
    COALESCE(_user_email, NEW.email),
    'Proprietário',
    'active',
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$function$;