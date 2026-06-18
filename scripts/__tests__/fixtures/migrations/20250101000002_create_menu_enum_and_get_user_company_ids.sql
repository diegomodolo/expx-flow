-- Fixture: enum menu_item_type + função SECURITY DEFINER get_user_company_ids.
DO $$ BEGIN
  CREATE TYPE public.menu_item_type AS ENUM (
    'dashboard',
    'clientes',
    'campanhas',
    'squad',
    'tarefas'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- SECURITY DEFINER: evita recursão de RLS em company_members.
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = _user_id;
$$;
