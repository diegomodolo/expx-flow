
-- Add authorizer_id column to teams table
ALTER TABLE public.teams ADD COLUMN authorizer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.teams.authorizer_id IS 'Employee who is the authorizer for this squad';
