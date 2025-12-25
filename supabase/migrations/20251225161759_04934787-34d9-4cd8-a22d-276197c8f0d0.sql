-- Tabela para armazenar configurações de sites WordPress
CREATE TABLE public.wordpress_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela para configurações de automação de posts WordPress
CREATE TABLE public.wordpress_auto_post_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  wordpress_site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
  post_briefing TEXT NOT NULL,
  post_type TEXT DEFAULT 'post',
  post_status TEXT DEFAULT 'draft',
  post_category TEXT,
  scheduled_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  scheduled_hours INTEGER[] NOT NULL DEFAULT '{10}',
  is_enabled BOOLEAN DEFAULT true,
  next_post_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ,
  reference_image_1 TEXT,
  reference_image_2 TEXT,
  reference_image_3 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela para posts gerados
CREATE TABLE public.wordpress_auto_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES wordpress_auto_post_configs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  excerpt TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  wordpress_post_id TEXT,
  wordpress_post_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.wordpress_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_auto_post_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_auto_posts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para wordpress_sites
CREATE POLICY "Users can view wordpress sites from their company"
ON public.wordpress_sites FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert wordpress sites in their company"
ON public.wordpress_sites FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update wordpress sites from their company"
ON public.wordpress_sites FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete wordpress sites from their company"
ON public.wordpress_sites FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Políticas RLS para wordpress_auto_post_configs
CREATE POLICY "Users can view wordpress configs from their company"
ON public.wordpress_auto_post_configs FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert wordpress configs in their company"
ON public.wordpress_auto_post_configs FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update wordpress configs from their company"
ON public.wordpress_auto_post_configs FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete wordpress configs from their company"
ON public.wordpress_auto_post_configs FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Políticas RLS para wordpress_auto_posts
CREATE POLICY "Users can view wordpress posts from their company"
ON public.wordpress_auto_posts FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert wordpress posts in their company"
ON public.wordpress_auto_posts FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update wordpress posts from their company"
ON public.wordpress_auto_posts FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete wordpress posts from their company"
ON public.wordpress_auto_posts FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_wordpress_sites_updated_at
BEFORE UPDATE ON public.wordpress_sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wordpress_auto_post_configs_updated_at
BEFORE UPDATE ON public.wordpress_auto_post_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();