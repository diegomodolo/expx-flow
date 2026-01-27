-- Add UNIQUE constraint for (company_id, external_id) to support upsert deduplication
-- This allows the same external_id to exist for different companies
-- and allows multiple NULL external_ids (Postgres allows multiple NULLs in unique)

ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_company_external_id_unique 
UNIQUE (company_id, external_id);