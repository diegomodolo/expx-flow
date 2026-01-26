-- Create table for editor element library
CREATE TABLE public.editor_element_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'custom',
  tags TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_element_library_company ON public.editor_element_library(company_id);
CREATE INDEX idx_element_library_category ON public.editor_element_library(category);

-- Enable RLS
ALTER TABLE public.editor_element_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view elements from their company
CREATE POLICY "Users can view elements from their company"
  ON public.editor_element_library FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert elements for their company
CREATE POLICY "Users can insert elements for their company"
  ON public.editor_element_library FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own elements or admins can update any
CREATE POLICY "Users can update their own elements"
  ON public.editor_element_library FOR UPDATE
  USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can delete their own elements or admins can delete any
CREATE POLICY "Users can delete their own elements"
  ON public.editor_element_library FOR DELETE
  USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );