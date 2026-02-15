
-- Add new columns to ia_agent_skills for skill configuration
ALTER TABLE public.ia_agent_skills
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ia_agent_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ia_agent_skills_updated_at
  BEFORE UPDATE ON public.ia_agent_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ia_agent_skills_updated_at();

-- RLS policies for INSERT, UPDATE, DELETE
CREATE POLICY "Authenticated users can create skills"
  ON public.ia_agent_skills FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update skills"
  ON public.ia_agent_skills FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete skills"
  ON public.ia_agent_skills FOR DELETE
  USING (auth.role() = 'authenticated');
