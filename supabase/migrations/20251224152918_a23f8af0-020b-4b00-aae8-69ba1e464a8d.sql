-- Tabela de configurações de postagem automática do Instagram
CREATE TABLE public.instagram_auto_post_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  
  -- Briefing específico para as postagens
  post_briefing TEXT NOT NULL,
  
  -- Configuração de horários (0=domingo, 1=segunda, ..., 6=sábado)
  scheduled_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  -- Horários do dia (0-23)
  scheduled_hours INTEGER[] NOT NULL DEFAULT '{12,18}',
  
  -- Controle
  is_enabled BOOLEAN DEFAULT true,
  next_post_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL,
  
  -- Garantir apenas uma config por cliente
  UNIQUE(client_id)
);

-- Tabela de postagens geradas/publicadas
CREATE TABLE public.instagram_auto_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Conteúdo gerado pela IA
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  
  -- Status: pending, publishing, published, failed
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  instagram_media_id TEXT,
  error_message TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_instagram_auto_post_configs_client ON public.instagram_auto_post_configs(client_id);
CREATE INDEX idx_instagram_auto_post_configs_enabled ON public.instagram_auto_post_configs(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_instagram_auto_post_configs_next_post ON public.instagram_auto_post_configs(next_post_at) WHERE is_enabled = true;

CREATE INDEX idx_instagram_auto_posts_config ON public.instagram_auto_posts(config_id);
CREATE INDEX idx_instagram_auto_posts_status ON public.instagram_auto_posts(status);
CREATE INDEX idx_instagram_auto_posts_scheduled ON public.instagram_auto_posts(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_instagram_auto_posts_client ON public.instagram_auto_posts(client_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_instagram_auto_post_configs_updated_at
  BEFORE UPDATE ON public.instagram_auto_post_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.instagram_auto_post_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_auto_posts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para instagram_auto_post_configs
CREATE POLICY "Users can view configs from their company"
  ON public.instagram_auto_post_configs
  FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert configs for their company"
  ON public.instagram_auto_post_configs
  FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update configs from their company"
  ON public.instagram_auto_post_configs
  FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete configs from their company"
  ON public.instagram_auto_post_configs
  FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Políticas RLS para instagram_auto_posts
CREATE POLICY "Users can view posts from their company"
  ON public.instagram_auto_posts
  FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert posts for their company"
  ON public.instagram_auto_posts
  FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update posts from their company"
  ON public.instagram_auto_posts
  FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete posts from their company"
  ON public.instagram_auto_posts
  FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Política para service role (edge functions)
CREATE POLICY "Service role full access to configs"
  ON public.instagram_auto_post_configs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to posts"
  ON public.instagram_auto_posts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');