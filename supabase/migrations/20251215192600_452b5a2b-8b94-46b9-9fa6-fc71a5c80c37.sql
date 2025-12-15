-- Create meta_pixels table
CREATE TABLE public.meta_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pixel_id TEXT NOT NULL,
  pixel_name TEXT NOT NULL,
  creation_time TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN DEFAULT false,
  is_unavailable BOOLEAN DEFAULT false,
  last_fired_time TIMESTAMP WITH TIME ZONE,
  data_use_setting TEXT,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, pixel_id)
);

-- Create pixel_events_log table
CREATE TABLE public.pixel_events_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id UUID NOT NULL REFERENCES public.meta_pixels(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_id TEXT,
  action_source TEXT DEFAULT 'system_generated',
  user_data JSONB,
  custom_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  meta_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_events_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for meta_pixels
CREATE POLICY "Company members can view pixels"
  ON public.meta_pixels FOR SELECT
  USING (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can create pixels"
  ON public.meta_pixels FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can update pixels"
  ON public.meta_pixels FOR UPDATE
  USING (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete pixels"
  ON public.meta_pixels FOR DELETE
  USING (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

-- RLS policies for pixel_events_log
CREATE POLICY "Company members can view pixel events"
  ON public.pixel_events_log FOR SELECT
  USING (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can create pixel events"
  ON public.pixel_events_log FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can update pixel events"
  ON public.pixel_events_log FOR UPDATE
  USING (company_id IN (
    SELECT company_members.company_id FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_meta_pixels_client_id ON public.meta_pixels(client_id);
CREATE INDEX idx_meta_pixels_company_id ON public.meta_pixels(company_id);
CREATE INDEX idx_meta_pixels_pixel_id ON public.meta_pixels(pixel_id);
CREATE INDEX idx_pixel_events_log_pixel_id ON public.pixel_events_log(pixel_id);
CREATE INDEX idx_pixel_events_log_client_id ON public.pixel_events_log(client_id);
CREATE INDEX idx_pixel_events_log_created_at ON public.pixel_events_log(created_at DESC);