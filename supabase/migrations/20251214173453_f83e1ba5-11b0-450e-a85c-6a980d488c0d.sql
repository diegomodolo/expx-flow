-- Tabela 1: facebook_pages (páginas do Facebook conectadas)
CREATE TABLE IF NOT EXISTS facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  page_category TEXT,
  instagram_business_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration_id, page_id)
);;

-- Tabela 2: instagram_accounts (contas do Instagram Business)
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_page_id UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  instagram_id TEXT NOT NULL,
  username TEXT NOT NULL,
  profile_picture_url TEXT,
  followers_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facebook_page_id, instagram_id)
);;

-- Tabela 3: scheduled_posts (posts agendados)
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  
  -- Conteúdo
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'carousel', 'reel')),
  caption TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  
  -- Destinos
  platforms TEXT[] NOT NULL DEFAULT '{}',
  facebook_page_id UUID REFERENCES facebook_pages(id),
  instagram_account_id UUID REFERENCES instagram_accounts(id),
  
  -- Agendamento
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  
  -- Resultados
  facebook_post_id TEXT,
  instagram_media_id TEXT,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadados
  visual_creative_id UUID,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);;

-- Tabela 4: post_publish_logs (logs de publicação)
CREATE TABLE IF NOT EXISTS post_publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  response_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at) WHERE status = 'scheduled';;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_company ON scheduled_posts(company_id);;

CREATE INDEX IF NOT EXISTS idx_facebook_pages_company ON facebook_pages(company_id);;

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_company ON instagram_accounts(company_id);;



-- RLS para facebook_pages
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view facebook pages" ON facebook_pages
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create facebook pages" ON facebook_pages
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update facebook pages" ON facebook_pages
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete facebook pages" ON facebook_pages
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- RLS para instagram_accounts
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view instagram accounts" ON instagram_accounts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create instagram accounts" ON instagram_accounts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update instagram accounts" ON instagram_accounts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete instagram accounts" ON instagram_accounts
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- RLS para scheduled_posts
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view scheduled posts" ON scheduled_posts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create scheduled posts" ON scheduled_posts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update scheduled posts" ON scheduled_posts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete scheduled posts" ON scheduled_posts
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- RLS para post_publish_logs
ALTER TABLE post_publish_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view publish logs" ON post_publish_logs
  FOR SELECT USING (
    scheduled_post_id IN (
      SELECT id FROM scheduled_posts 
      WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "System can create publish logs" ON post_publish_logs
  FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_facebook_pages_updated_at ON facebook_pages;
CREATE TRIGGER update_facebook_pages_updated_at
  BEFORE UPDATE ON facebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
