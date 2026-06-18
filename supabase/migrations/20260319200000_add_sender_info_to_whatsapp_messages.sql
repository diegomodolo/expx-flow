-- Add sender info columns for group messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT NULL;

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sender_phone TEXT DEFAULT NULL;


COMMENT ON COLUMN public.whatsapp_messages.sender_name IS 'Nome do remetente (relevante em mensagens de grupo)';

COMMENT ON COLUMN public.whatsapp_messages.sender_phone IS 'Telefone do remetente (relevante em mensagens de grupo)';