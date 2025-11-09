-- Create table for lead links
CREATE TABLE IF NOT EXISTS public.crm_lead_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_a_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  lead_b_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure no duplicates (A->B and B->A are the same link)
  CONSTRAINT unique_link CHECK (lead_a_id < lead_b_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_links_a ON public.crm_lead_links(lead_a_id);
CREATE INDEX IF NOT EXISTS idx_lead_links_b ON public.crm_lead_links(lead_b_id);

-- Enable RLS
ALTER TABLE public.crm_lead_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view lead links"
  ON public.crm_lead_links FOR SELECT
  USING (
    lead_a_id IN (
      SELECT l.id FROM public.crm_leads l
      JOIN public.crm_workspaces w ON w.id = l.workspace_id
      JOIN public.company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace users can view lead links"
  ON public.crm_lead_links FOR SELECT
  USING (
    lead_a_id IN (
      SELECT id FROM public.crm_leads 
      WHERE workspace_id IN (
        SELECT id FROM public.crm_workspaces WHERE is_active = true
      )
    )
  );

CREATE POLICY "Anyone can create lead links"
  ON public.crm_lead_links FOR INSERT
  WITH CHECK (true);

-- Add workflow fields to crm_stages
ALTER TABLE public.crm_stages
ADD COLUMN IF NOT EXISTS workflow_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS workflow_target_board_id UUID REFERENCES public.crm_boards(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS workflow_target_stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL;

-- Create index for workflow queries
CREATE INDEX IF NOT EXISTS idx_stages_workflow ON public.crm_stages(workflow_enabled) 
  WHERE workflow_enabled = true;