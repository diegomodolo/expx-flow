-- Fase 1: Adicionar campos de personalização na tabela crm_workspaces
ALTER TABLE public.crm_workspaces 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_title TEXT DEFAULT 'Bem-vindo ao CRM',
ADD COLUMN IF NOT EXISTS login_subtitle TEXT DEFAULT 'Faça login para acessar o sistema',
ADD COLUMN IF NOT EXISTS login_primary_color TEXT DEFAULT '#3B82F6';

-- Adicionar campo role na tabela crm_users
ALTER TABLE public.crm_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator'));

-- Atualizar usuários existentes para serem admin por padrão (primeiros usuários)
UPDATE public.crm_users 
SET role = 'admin' 
WHERE role IS NULL;