-- Add email and phone fields to companies table
ALTER TABLE public.companies ADD COLUMN email TEXT;
ALTER TABLE public.companies ADD COLUMN phone TEXT;

-- Create function to automatically create company for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create a personal company for the new user
  INSERT INTO public.companies (name, created_by, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Minha Empresa'),
    NEW.id,
    NEW.email
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create company when user signs up
CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();