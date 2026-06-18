-- Criar tabela para tokens de desqualificação de leads
CREATE TABLE IF NOT EXISTS public.lead_disqualification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Criar tabela para reports de desqualificação
CREATE TABLE IF NOT EXISTS public.lead_disqualification_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  token_id UUID NOT NULL,
  reporter_name TEXT NOT NULL,
  lead_received_date DATE NOT NULL,
  disqualification_reason TEXT NOT NULL CHECK (disqualification_reason IN ('fora_perfil', 'informacoes_incorretas', 'contato_errado', 'ligacao_sem_resposta', 'outro')),
  additional_notes TEXT,
  evidence_file_url TEXT,
  conversation_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;



-- Habilitar RLS
ALTER TABLE public.lead_disqualification_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lead_disqualification_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view tokens" 
ON public.lead_disqualification_tokens 
FOR SELECT 
USING (company_id IN (
  SELECT company_id FROM company_members 
  WHERE user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create tokens" 
ON public.lead_disqualification_tokens 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_id FROM company_members 
  WHERE user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update tokens" 
ON public.lead_disqualification_tokens 
FOR UPDATE 
USING (company_id IN (
  SELECT company_id FROM company_members 
  WHERE user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can create reports with valid token" 
ON public.lead_disqualification_reports 
FOR INSERT 
WITH CHECK (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can view reports" 
ON public.lead_disqualification_reports 
FOR SELECT 
USING (company_id IN (
  SELECT company_id FROM company_members 
  WHERE user_id = auth.uid()
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Criar função para gerar token automaticamente quando cliente é criado
CREATE OR REPLACE FUNCTION public.create_lead_disqualification_token()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_disqualification_tokens (client_id, company_id)
  VALUES (NEW.id, NEW.company_id);

  RETURN NEW;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS create_token_on_client_creation ON public.clients;
CREATE TRIGGER create_token_on_client_creation
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_disqualification_token();



-- Criar tokens para clientes existentes
INSERT INTO public.lead_disqualification_tokens (client_id, company_id)
SELECT id, company_id FROM public.clients 
WHERE id NOT IN (
  SELECT client_id FROM public.lead_disqualification_tokens
);


-- Criar bucket para evidências se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-evidence', 'lead-evidence', false)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Anyone can upload evidence during report"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lead-evidence');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can view evidence"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lead-evidence');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_lead_disqualification_tokens_updated_at ON public.lead_disqualification_tokens;
CREATE TRIGGER update_lead_disqualification_tokens_updated_at
  BEFORE UPDATE ON public.lead_disqualification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_disqualification_reports_updated_at ON public.lead_disqualification_reports;
CREATE TRIGGER update_lead_disqualification_reports_updated_at
  BEFORE UPDATE ON public.lead_disqualification_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
