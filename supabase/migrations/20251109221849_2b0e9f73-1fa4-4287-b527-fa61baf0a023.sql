-- Adicionar campo is_manual à tabela crm_lead_activities
ALTER TABLE public.crm_lead_activities
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
DO $$ BEGIN
  CREATE POLICY "Anyone can create activities in workspace"
  ON public.crm_lead_activities FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.crm_leads 
      WHERE workspace_id IN (
        SELECT id FROM public.crm_workspaces WHERE is_active = true
      )
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
