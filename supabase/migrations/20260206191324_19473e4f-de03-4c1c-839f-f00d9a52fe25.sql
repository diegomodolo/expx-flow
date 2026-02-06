-- =====================================================
-- Integração WhatsApp Business Platform (Meta Cloud API)
-- =====================================================

-- 1. Adicionar colunas na tabela whatsapp_configs para Meta
ALTER TABLE public.whatsapp_configs
ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
ADD COLUMN IF NOT EXISTS meta_access_token text,
ADD COLUMN IF NOT EXISTS meta_business_account_id text,
ADD COLUMN IF NOT EXISTS meta_app_id text,
ADD COLUMN IF NOT EXISTS meta_webhook_verify_token text,
ADD COLUMN IF NOT EXISTS meta_is_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_phone_number text,
ADD COLUMN IF NOT EXISTS meta_last_connection_test timestamp with time zone;

-- 2. Adicionar colunas na tabela whatsapp_instances para suportar instâncias Meta
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
ADD COLUMN IF NOT EXISTS meta_access_token text,
ADD COLUMN IF NOT EXISTS meta_business_account_id text;

-- 3. Criar tabela para templates Meta aprovados
CREATE TABLE IF NOT EXISTS public.whatsapp_meta_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_id text NOT NULL,
  language text NOT NULL DEFAULT 'pt_BR',
  category text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  header_format text,
  header_text text,
  body_text text NOT NULL,
  footer_text text,
  buttons jsonb,
  variables jsonb,
  synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_id)
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_meta_templates_company_id ON public.whatsapp_meta_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_meta_templates_status ON public.whatsapp_meta_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_meta_templates_category ON public.whatsapp_meta_templates(category);

-- 5. Habilitar RLS
ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para whatsapp_meta_templates usando get_user_company_ids
CREATE POLICY "Users can view templates from their company"
ON public.whatsapp_meta_templates
FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert templates for their company"
ON public.whatsapp_meta_templates
FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update templates from their company"
ON public.whatsapp_meta_templates
FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete templates from their company"
ON public.whatsapp_meta_templates
FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- 7. Criar trigger para updated_at
CREATE OR REPLACE TRIGGER update_whatsapp_meta_templates_updated_at
BEFORE UPDATE ON public.whatsapp_meta_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Adicionar comentários descritivos
COMMENT ON TABLE public.whatsapp_meta_templates IS 'Templates de mensagem aprovados pela Meta para WhatsApp Business API';
COMMENT ON COLUMN public.whatsapp_meta_templates.template_name IS 'Nome do template na Meta';
COMMENT ON COLUMN public.whatsapp_meta_templates.template_id IS 'ID único do template na Meta';
COMMENT ON COLUMN public.whatsapp_meta_templates.category IS 'Categoria do template: MARKETING, UTILITY, AUTHENTICATION';
COMMENT ON COLUMN public.whatsapp_meta_templates.status IS 'Status de aprovação: APPROVED, PENDING, REJECTED';
COMMENT ON COLUMN public.whatsapp_meta_templates.header_format IS 'Formato do header: TEXT, IMAGE, VIDEO, DOCUMENT';
COMMENT ON COLUMN public.whatsapp_meta_templates.variables IS 'Array de variáveis do template com nome e exemplo';