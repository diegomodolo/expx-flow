
-- Add is_collaborator flag to ia_agents
ALTER TABLE public.ia_agents ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false;

-- Add ia_agent_id to employees to link agent-employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ia_agent_id uuid REFERENCES public.ia_agents(id) ON DELETE SET NULL;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_employees_ia_agent_id ON public.employees(ia_agent_id) WHERE ia_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ia_agents_is_collaborator ON public.ia_agents(is_collaborator) WHERE is_collaborator = true;
