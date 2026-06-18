DO $$ BEGIN
  ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_company_external_id_unique 
UNIQUE (company_id, external_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
