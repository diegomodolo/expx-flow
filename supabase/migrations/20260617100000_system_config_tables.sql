-- ============================================================
-- Sprint 1.1.2 — system_config_* (8 tabelas singleton) + is_system_owner()
-- Self-hosting: externalização de credenciais globais do projeto.
-- Padrão: env var > banco de dados. RLS: somente owner.
-- ============================================================

-- --------------------------------------------------------
-- 1) Helper is_system_owner() — SECURITY DEFINER
-- --------------------------------------------------------
-- Considera "owner de sistema" o primeiro usuário da instalação
-- (auth.users ordenado por created_at LIMIT 1) ou qualquer user
-- com role='owner' em profiles.
CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _current_id UUID;
  _role TEXT;
BEGIN
  _current_id := auth.uid();
  IF _current_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1) role='owner' em profiles
  SELECT role INTO _role
  FROM public.profiles
  WHERE id = _current_id;
  IF _role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- 2) Primeiro usuário criado na instalação
  SELECT id INTO _owner_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;
  RETURN _owner_id = _current_id;
END;
$$;

-- --------------------------------------------------------
-- 2) Tabelas singleton — uma única linha por instalação
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_config_app (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_url     TEXT,
  app_name    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_facebook (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_id             TEXT,
  app_secret         TEXT,
  graph_api_version  TEXT NOT NULL DEFAULT 'v21.0',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_google (
  id                       INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ads_client_id            TEXT,
  ads_client_secret        TEXT,
  ads_developer_token      TEXT,
  meet_client_id           TEXT,
  meet_client_secret       TEXT,
  youtube_api_key          TEXT,
  gcp_service_account_json TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_ai (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  openrouter_api_key TEXT,
  openai_api_key     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_email (
  id             INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  resend_api_key TEXT,
  from_email     TEXT,
  from_name      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_tools (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  apify_api_token   TEXT,
  firecrawl_api_key TEXT,
  shotstack_api_key TEXT,
  youtube_proxy_url TEXT,
  api4com_base_url  TEXT NOT NULL DEFAULT 'https://api.api4com.com',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_discord (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bot_token  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config_github (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pat        TEXT,
  repo_owner TEXT,
  repo_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 3) Trigger updated_at
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'system_config_app',
    'system_config_facebook',
    'system_config_google',
    'system_config_ai',
    'system_config_email',
    'system_config_tools',
    'system_config_discord',
    'system_config_github'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I;', t || '_touch', t
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();',
      t || '_touch', t
    );
  END LOOP;
END $$;

-- --------------------------------------------------------
-- 4) RLS — somente system_owner
-- --------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'system_config_app',
    'system_config_facebook',
    'system_config_google',
    'system_config_ai',
    'system_config_email',
    'system_config_tools',
    'system_config_discord',
    'system_config_github'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'owner_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL
       TO authenticated
       USING (public.is_system_owner())
       WITH CHECK (public.is_system_owner());',
      'owner_all_' || t, t
    );
  END LOOP;
END $$;

-- --------------------------------------------------------
-- 5) GRANT
-- --------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'system_config_app',
    'system_config_facebook',
    'system_config_google',
    'system_config_ai',
    'system_config_email',
    'system_config_tools',
    'system_config_discord',
    'system_config_github'
  ])
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t
    );
  END LOOP;
END $$;

-- --------------------------------------------------------
-- 6) Seed de linha única (id=1) para facilitar UPSERT
-- --------------------------------------------------------
INSERT INTO public.system_config_app (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_facebook (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_google (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_ai (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_email (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_tools (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_discord (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_config_github (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
