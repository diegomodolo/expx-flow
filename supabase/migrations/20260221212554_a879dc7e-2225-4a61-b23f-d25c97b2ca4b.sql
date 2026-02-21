
-- 1. Create youtube_content_labs table
CREATE TABLE public.youtube_content_labs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- One client can have at most one lab
CREATE UNIQUE INDEX idx_youtube_content_labs_client_unique 
  ON public.youtube_content_labs(client_id) 
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_youtube_content_labs_company ON public.youtube_content_labs(company_id);
CREATE INDEX idx_youtube_content_labs_client ON public.youtube_content_labs(client_id);

-- RLS
ALTER TABLE public.youtube_content_labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labs of their company"
  ON public.youtube_content_labs FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create labs in their company"
  ON public.youtube_content_labs FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update labs of their company"
  ON public.youtube_content_labs FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete labs of their company"
  ON public.youtube_content_labs FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_youtube_content_labs_updated_at
  BEFORE UPDATE ON public.youtube_content_labs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_youtube_updated_at();

-- 2. Add lab_id to child tables
ALTER TABLE public.youtube_monitored_channels
  ADD COLUMN lab_id UUID REFERENCES public.youtube_content_labs(id) ON DELETE CASCADE;

ALTER TABLE public.youtube_channel_categories
  ADD COLUMN lab_id UUID REFERENCES public.youtube_content_labs(id) ON DELETE CASCADE;

ALTER TABLE public.youtube_content_suggestions
  ADD COLUMN lab_id UUID REFERENCES public.youtube_content_labs(id) ON DELETE CASCADE;

ALTER TABLE public.youtube_scripts
  ADD COLUMN lab_id UUID REFERENCES public.youtube_content_labs(id) ON DELETE CASCADE;

ALTER TABLE public.youtube_thumbnail_configs
  ADD COLUMN lab_id UUID REFERENCES public.youtube_content_labs(id) ON DELETE CASCADE;

-- 3. Migrate existing data: create labs for clients that have channels
INSERT INTO public.youtube_content_labs (company_id, name, client_id)
SELECT DISTINCT 
  ymc.company_id,
  COALESCE(c.name, 'Lab sem nome'),
  c.id
FROM public.youtube_monitored_channels ymc
JOIN public.clients c ON c.id = ymc.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.youtube_content_labs ycl WHERE ycl.client_id = c.id
);

-- Also create labs for clients that have suggestions but no channels
INSERT INTO public.youtube_content_labs (company_id, name, client_id)
SELECT DISTINCT 
  ycs.company_id,
  COALESCE(c.name, 'Lab sem nome'),
  c.id
FROM public.youtube_content_suggestions ycs
JOIN public.clients c ON c.id = ycs.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.youtube_content_labs ycl WHERE ycl.client_id = c.id
);

-- Also create labs for clients that have scripts but no channels/suggestions
INSERT INTO public.youtube_content_labs (company_id, name, client_id)
SELECT DISTINCT 
  ys.company_id,
  COALESCE(c.name, 'Lab sem nome'),
  c.id
FROM public.youtube_scripts ys
JOIN public.clients c ON c.id = ys.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.youtube_content_labs ycl WHERE ycl.client_id = c.id
);

-- 4. Update child tables with lab_id
UPDATE public.youtube_monitored_channels ymc
SET lab_id = ycl.id
FROM public.youtube_content_labs ycl
WHERE ycl.client_id = ymc.client_id
  AND ymc.lab_id IS NULL;

UPDATE public.youtube_channel_categories ycc
SET lab_id = ycl.id
FROM public.youtube_content_labs ycl
WHERE ycl.client_id = ycc.client_id
  AND ycc.lab_id IS NULL;

UPDATE public.youtube_content_suggestions ycs
SET lab_id = ycl.id
FROM public.youtube_content_labs ycl
WHERE ycl.client_id = ycs.client_id
  AND ycs.lab_id IS NULL;

UPDATE public.youtube_scripts ys
SET lab_id = ycl.id
FROM public.youtube_content_labs ycl
WHERE ycl.client_id = ys.client_id
  AND ys.lab_id IS NULL;

UPDATE public.youtube_thumbnail_configs ytc
SET lab_id = ycl.id
FROM public.youtube_content_labs ycl
WHERE ycl.client_id = ytc.client_id
  AND ytc.lab_id IS NULL;

-- 5. Add indexes for lab_id
CREATE INDEX idx_youtube_monitored_channels_lab ON public.youtube_monitored_channels(lab_id);
CREATE INDEX idx_youtube_channel_categories_lab ON public.youtube_channel_categories(lab_id);
CREATE INDEX idx_youtube_content_suggestions_lab ON public.youtube_content_suggestions(lab_id);
CREATE INDEX idx_youtube_scripts_lab ON public.youtube_scripts(lab_id);
CREATE INDEX idx_youtube_thumbnail_configs_lab ON public.youtube_thumbnail_configs(lab_id);
