DO $$ BEGIN
  ALTER TABLE public.content_generations 
ADD CONSTRAINT content_generations_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
