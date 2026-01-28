-- Tabela de configuração do agente de IA para WhatsApp
CREATE TABLE public.whatsapp_ai_agent_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  
  -- Identidade e Função
  agent_name VARCHAR(100) DEFAULT 'Assistente',
  department VARCHAR(50) DEFAULT 'atendimento_geral',
  primary_objective VARCHAR(50) DEFAULT 'resolver_duvida',
  
  -- Equalizador de Tom e Voz (0-100)
  formality_level INTEGER DEFAULT 50 CHECK (formality_level >= 0 AND formality_level <= 100),
  empathy_level INTEGER DEFAULT 50 CHECK (empathy_level >= 0 AND empathy_level <= 100),
  enthusiasm_level INTEGER DEFAULT 50 CHECK (enthusiasm_level >= 0 AND enthusiasm_level <= 100),
  emoji_usage VARCHAR(20) DEFAULT 'moderate' CHECK (emoji_usage IN ('none', 'moderate', 'intense')),
  
  -- Formatação da Resposta
  response_length VARCHAR(20) DEFAULT 'medium' CHECK (response_length IN ('short', 'medium', 'long')),
  use_bold BOOLEAN DEFAULT true,
  use_lists BOOLEAN DEFAULT true,
  use_short_paragraphs BOOLEAN DEFAULT true,
  mandatory_cta TEXT,
  
  -- Regras e Guardrails
  blacklist_words TEXT[] DEFAULT '{}',
  min_confidence_threshold INTEGER DEFAULT 70 CHECK (min_confidence_threshold >= 0 AND min_confidence_threshold <= 100),
  escalation_message TEXT DEFAULT 'Vou transferir você para um de nossos especialistas que poderá ajudá-lo melhor.',
  
  -- Contexto do Cliente
  use_purchase_history BOOLEAN DEFAULT false,
  use_client_name BOOLEAN DEFAULT true,
  use_satisfaction_score BOOLEAN DEFAULT false,
  use_conversation_history BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint de unicidade por empresa (ou por instância se especificada)
  CONSTRAINT unique_company_instance_config UNIQUE (company_id, instance_id)
);

-- Index para busca rápida
CREATE INDEX idx_whatsapp_ai_config_company ON public.whatsapp_ai_agent_config(company_id);
CREATE INDEX idx_whatsapp_ai_config_instance ON public.whatsapp_ai_agent_config(instance_id) WHERE instance_id IS NOT NULL;

-- RLS
ALTER TABLE public.whatsapp_ai_agent_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their company AI config"
ON public.whatsapp_ai_agent_config
FOR SELECT
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Users can insert AI config for their company"
ON public.whatsapp_ai_agent_config
FOR INSERT
WITH CHECK (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Users can update their company AI config"
ON public.whatsapp_ai_agent_config
FOR UPDATE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Users can delete their company AI config"
ON public.whatsapp_ai_agent_config
FOR DELETE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_ai_config_updated_at
BEFORE UPDATE ON public.whatsapp_ai_agent_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();