-- Adicionar coluna admintoken na tabela whatsapp_configs
ALTER TABLE public.whatsapp_configs 
ADD COLUMN IF NOT EXISTS uazapi_admintoken text;

-- Adicionar novas colunas na tabela whatsapp_instances para suportar UazapiGO v2
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS uazapi_instance_id text,
ADD COLUMN IF NOT EXISTS uazapi_token text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS profile_name text,
ADD COLUMN IF NOT EXISTS profile_pic_url text;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.whatsapp_configs.uazapi_admintoken IS 'Admin token para criar instâncias automaticamente na UazapiGO';
COMMENT ON COLUMN public.whatsapp_instances.uazapi_instance_id IS 'ID da instância na UazapiGO (ex: r183e2ef9)';
COMMENT ON COLUMN public.whatsapp_instances.uazapi_token IS 'Token único desta instância na UazapiGO';
COMMENT ON COLUMN public.whatsapp_instances.status IS 'Status da conexão: disconnected, connecting, connected';
COMMENT ON COLUMN public.whatsapp_instances.profile_name IS 'Nome do perfil WhatsApp quando conectado';
COMMENT ON COLUMN public.whatsapp_instances.profile_pic_url IS 'URL da foto do perfil WhatsApp';