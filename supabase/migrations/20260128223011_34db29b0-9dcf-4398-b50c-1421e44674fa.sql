-- Allow 'analysis' role in whatsapp_ai_chat_messages
ALTER TABLE public.whatsapp_ai_chat_messages
  DROP CONSTRAINT IF EXISTS whatsapp_ai_chat_messages_role_check;
DO $$ BEGIN
  ALTER TABLE public.whatsapp_ai_chat_messages
  ADD CONSTRAINT whatsapp_ai_chat_messages_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'analysis'::text]));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
