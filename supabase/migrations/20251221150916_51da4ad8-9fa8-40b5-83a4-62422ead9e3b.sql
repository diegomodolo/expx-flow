-- Add cnaes column to lead_segments table for ListaCNAE integration
ALTER TABLE public.lead_segments 
ADD COLUMN IF NOT EXISTS cnaes TEXT[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN public.lead_segments.cnaes IS 'Array of CNAE codes associated with this segment for ListaCNAE integration';