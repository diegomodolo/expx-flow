-- Adicionar user_id à tabela de integrações Google Meet
ALTER TABLE public.google_meet_integrations
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL;

-- Remover constraint UNIQUE antiga (company_id)
ALTER TABLE public.google_meet_integrations
  DROP CONSTRAINT IF EXISTS google_meet_integrations_company_id_key;

-- Nova constraint: 1 integração por user por empresa + 1 da empresa (user_id=NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_meet_integrations_company_user
  ON public.google_meet_integrations (company_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Atualizar RLS policies
DROP POLICY IF EXISTS "Users can view google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can view google meet integrations"
ON public.google_meet_integrations FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can insert google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can insert google meet integrations"
ON public.google_meet_integrations FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can update google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can update google meet integrations"
ON public.google_meet_integrations FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can delete google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can delete google meet integrations"
ON public.google_meet_integrations FOR DELETE
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND company_id IN (
    SELECT cm.company_id FROM public.company_members cm
    WHERE cm.user_id = auth.uid() AND cm.role = 'owner'
  ))
);
