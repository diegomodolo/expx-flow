-- Checklist Templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);;



ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view checklist templates of their company"
  ON public.checklist_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert checklist templates for their company"
  ON public.checklist_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update checklist templates of their company"
  ON public.checklist_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete checklist templates of their company"
  ON public.checklist_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

-- Checklist Template Items
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);;



ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view checklist template items"
  ON public.checklist_template_items FOR SELECT
  USING (template_id IN (SELECT id FROM public.checklist_templates WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert checklist template items"
  ON public.checklist_template_items FOR INSERT
  WITH CHECK (template_id IN (SELECT id FROM public.checklist_templates WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update checklist template items"
  ON public.checklist_template_items FOR UPDATE
  USING (template_id IN (SELECT id FROM public.checklist_templates WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete checklist template items"
  ON public.checklist_template_items FOR DELETE
  USING (template_id IN (SELECT id FROM public.checklist_templates WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON public.checklist_templates;
CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
