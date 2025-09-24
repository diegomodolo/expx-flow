-- Add team_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_clients_team_id ON public.clients(team_id);