-- Add gestor_id column to clients table to explicitly set the manager
ALTER TABLE public.clients 
ADD COLUMN gestor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_clients_gestor_id ON public.clients(gestor_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.clients.gestor_id IS 'ID do colaborador (gestor) responsável por este cliente. Se NULL, usa user_id como fallback.';