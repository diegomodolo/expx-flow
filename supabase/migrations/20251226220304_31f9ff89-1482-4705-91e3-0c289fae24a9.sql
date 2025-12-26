-- Create table for deal-tag relationships
CREATE TABLE public.crm_deal_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.crm_deal_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view deal tags in their workspace"
ON public.crm_deal_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.crm_deals d
    JOIN public.crm_workspaces w ON d.workspace_id = w.id
    JOIN public.company_members cm ON w.company_id = cm.company_id
    WHERE d.id = crm_deal_tags.deal_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage deal tags in their workspace"
ON public.crm_deal_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.crm_deals d
    JOIN public.crm_workspaces w ON d.workspace_id = w.id
    JOIN public.company_members cm ON w.company_id = cm.company_id
    WHERE d.id = crm_deal_tags.deal_id AND cm.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_crm_deal_tags_deal_id ON public.crm_deal_tags(deal_id);
CREATE INDEX idx_crm_deal_tags_tag_id ON public.crm_deal_tags(tag_id);