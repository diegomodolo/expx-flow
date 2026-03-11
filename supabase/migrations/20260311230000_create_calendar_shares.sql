-- Tabela de compartilhamento de calendario entre usuarios
CREATE TABLE public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  color TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

CREATE INDEX idx_calendar_shares_company_id ON public.calendar_shares(company_id);
CREATE INDEX idx_calendar_shares_owner_id ON public.calendar_shares(owner_id);
CREATE INDEX idx_calendar_shares_shared_with_id ON public.calendar_shares(shared_with_id);

ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Usuarios veem shares da sua empresa onde sao dono ou destinatario
CREATE POLICY "Users can view their calendar shares"
ON public.calendar_shares
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
  AND (owner_id = auth.uid() OR shared_with_id = auth.uid())
);

CREATE POLICY "Users can create calendar shares they own"
ON public.calendar_shares
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their shares"
ON public.calendar_shares
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their shares"
ON public.calendar_shares
FOR DELETE
USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_shares TO authenticated;

-- Adicionar permissoes ao enum menu_item_type
ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'calendario';
ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'calendario-admin';
