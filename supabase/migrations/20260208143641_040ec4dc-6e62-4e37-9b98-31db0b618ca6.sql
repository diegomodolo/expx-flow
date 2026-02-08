-- Create table for YouTube script slides
CREATE TABLE public.youtube_script_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.youtube_scripts(id) ON DELETE CASCADE,
  slide_order INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT,
  visual_suggestion TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.youtube_script_slides ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups by script
CREATE INDEX idx_youtube_script_slides_script_id ON public.youtube_script_slides(script_id);
CREATE INDEX idx_youtube_script_slides_order ON public.youtube_script_slides(script_id, slide_order);

-- Create policies for user access (using same pattern as youtube_scripts)
CREATE POLICY "Users can view slides in their company"
ON public.youtube_script_slides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.youtube_scripts s
    WHERE s.id = youtube_script_slides.script_id
    AND (
      s.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
      OR s.company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can create slides in their company"
ON public.youtube_script_slides
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.youtube_scripts s
    WHERE s.id = youtube_script_slides.script_id
    AND (
      s.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
      OR s.company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update slides in their company"
ON public.youtube_script_slides
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.youtube_scripts s
    WHERE s.id = youtube_script_slides.script_id
    AND (
      s.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
      OR s.company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete slides in their company"
ON public.youtube_script_slides
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.youtube_scripts s
    WHERE s.id = youtube_script_slides.script_id
    AND (
      s.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
      OR s.company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_youtube_script_slides_updated_at
BEFORE UPDATE ON public.youtube_script_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();