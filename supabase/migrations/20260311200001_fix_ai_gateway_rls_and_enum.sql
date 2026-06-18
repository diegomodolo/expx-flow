-- Fix: usar SECURITY DEFINER para RLS de ai_api_keys
-- (subqueries em tabelas com RLS falham silenciosamente)

CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = _company_id
      AND company_members.user_id = _user_id
      AND company_members.role = 'owner'
  );

END;

$$;


-- Drop e recriar policies de ai_api_keys
DROP POLICY IF EXISTS "Owners can view api keys" ON public.ai_api_keys;

DROP POLICY IF EXISTS "Owners can insert api keys" ON public.ai_api_keys;

DROP POLICY IF EXISTS "Owners can update api keys" ON public.ai_api_keys;
DO $$ BEGIN
  CREATE POLICY "Owners can view api keys"
  ON public.ai_api_keys FOR SELECT
  USING (is_company_owner(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can insert api keys"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (is_company_owner(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can update api keys"
  ON public.ai_api_keys FOR UPDATE
  USING (is_company_owner(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Adicionar enum para permissão configurar-ia
ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'configurar-ia';