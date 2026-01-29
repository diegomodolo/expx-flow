-- Adicionar campo para marcar usuários como atendentes oficiais da instância
ALTER TABLE public.whatsapp_instance_users 
ADD COLUMN IF NOT EXISTS is_attendant BOOLEAN NOT NULL DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.whatsapp_instance_users.is_attendant IS 
'Quando true, indica que este usuário é atendente oficial da instância. Todas as conversas e métricas da instância serão atribuídas a ele nos relatórios e dashboards de CS.';