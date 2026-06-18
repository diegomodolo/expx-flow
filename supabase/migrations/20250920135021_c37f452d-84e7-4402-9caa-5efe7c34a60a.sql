-- Ajustar as políticas RLS para permitir acesso público aos tokens
-- e remover a dependência de is_active

-- Primeiro, vamos dropar as políticas existentes
DROP POLICY IF EXISTS "Company members can view tokens" ON public.lead_disqualification_tokens;

DROP POLICY IF EXISTS "Company members can create tokens" ON public.lead_disqualification_tokens;

DROP POLICY IF EXISTS "Company members can update tokens" ON public.lead_disqualification_tokens;

DROP POLICY IF EXISTS "Company members can delete tokens" ON public.lead_disqualification_tokens;
DO $$ BEGIN
  CREATE POLICY "Anyone can read tokens for validation"
ON public.lead_disqualification_tokens
FOR SELECT
USING (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create tokens"
ON public.lead_disqualification_tokens
FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update tokens"
ON public.lead_disqualification_tokens
FOR UPDATE
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete tokens"
ON public.lead_disqualification_tokens
FOR DELETE
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
