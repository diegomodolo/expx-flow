
-- Add columns for Edge Function code and external API configuration
ALTER TABLE public.ia_agent_skills 
ADD COLUMN IF NOT EXISTS edge_function_code text,
ADD COLUMN IF NOT EXISTS external_api_config jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.ia_agent_skills.edge_function_code IS 'Source code of the Edge Function';
COMMENT ON COLUMN public.ia_agent_skills.external_api_config IS 'External API configuration (url, method, auth_type, auth_config, headers)';
