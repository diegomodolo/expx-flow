DO $$ BEGIN
  ALTER TABLE public.whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_company_instance_phone_unique 
UNIQUE (company_id, instance_id, phone);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
