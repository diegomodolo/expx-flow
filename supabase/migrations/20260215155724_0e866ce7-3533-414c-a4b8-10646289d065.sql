
-- Add skill_type to distinguish between edge_function and javascript skills
ALTER TABLE public.ia_agent_skills 
ADD COLUMN IF NOT EXISTS skill_type text NOT NULL DEFAULT 'edge_function';

-- Add output_parameters for defining expected output schema
ALTER TABLE public.ia_agent_skills 
ADD COLUMN IF NOT EXISTS output_parameters jsonb DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.ia_agent_skills.skill_type IS 'Type of skill: edge_function or javascript';
COMMENT ON COLUMN public.ia_agent_skills.output_parameters IS 'JSON Schema for output parameters';
