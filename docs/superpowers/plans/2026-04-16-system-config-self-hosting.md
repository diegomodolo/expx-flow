# System Config Self-Hosting Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir self-hosting completo do projeto, movendo todas as configurações de integrações do `.env` para tabelas no banco configuráveis pela UI de Configurações do Sistema.

**Architecture:** 8 tabelas `system_config_*` no banco (uma por integração), um helper compartilhado `_shared/getSystemConfig.ts` para edge functions lerem do banco, e uma nova entrada "Sistema" no `SettingsLayout` com formulários por categoria. O `.env` fica com apenas `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + Edge Functions Deno), TanStack React Query, React Hook Form, shadcn/ui, Sonner (toasts).

---

## File Map

### Criar

| Arquivo                                                       | Responsabilidade                                  |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `supabase/migrations/20260416100000_system_config_tables.sql` | 8 tabelas system*config*\* + RLS + GRANT          |
| `supabase/functions/_shared/getSystemConfig.ts`               | Helper para edge functions lerem config do banco  |
| `src/hooks/useSystemConfig.ts`                                | Hook React Query para ler/upsert system*config*\* |
| `src/components/settings/SystemConfigSettings.tsx`            | Página principal com tabs por integração          |

### Modificar

| Arquivo                                                      | O que muda                                             |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `src/integrations/supabase/client.ts`                        | Remover constantes duplicadas, usar só import.meta.env |
| `src/integrations/supabase/publicClient.ts`                  | Idem                                                   |
| `src/hooks/useWhatsAppMediaCache.ts`                         | Trocar SUPABASE_URL hardcoded por import.meta.env      |
| `src/hooks/useFacebookIntegration.tsx`                       | Ler app_id do banco; fix domain fallback hardcoded     |
| `src/components/whatsapp/MetaConnectionCard.tsx`             | Gerar webhook URL de import.meta.env.VITE_SUPABASE_URL |
| `src/components/instagram/InstagramKeywordAutomation.tsx`    | Idem                                                   |
| `src/hooks/useWebhookTokens.tsx`                             | Idem                                                   |
| `src/pages/DashboardTrafegoPublic.tsx`                       | Gerar URL da edge function de import.meta.env          |
| `src/components/settings/SettingsLayout.tsx`                 | Adicionar item "Sistema" no nav                        |
| `src/pages/Configuracoes.tsx`                                | Adicionar rota `/configuracoes/sistema`                |
| `supabase/functions/_shared/ai-gateway.ts`                   | Ler openrouter_api_key do banco                        |
| `supabase/functions/facebook-oauth/index.ts`                 | Ler config do banco; fix domain fallback               |
| `supabase/functions/fetch-facebook-pages/index.ts`           | Ler app_id/secret do banco                             |
| `supabase/functions/meta-whatsapp-webhook/index.ts`          | Ler app_secret do banco                                |
| `supabase/functions/instagram-messaging-webhook/index.ts`    | Idem                                                   |
| `supabase/functions/resend-employee-invite/index.ts`         | Ler email config + app_url do banco                    |
| `supabase/functions/invite-employee/index.ts`                | Idem                                                   |
| `supabase/functions/create-employee-user/index.ts`           | Ler from_email do banco                                |
| `supabase/functions/invite-with-magic-link/index.ts`         | Ler email config + app_url do banco                    |
| `supabase/functions/send-presentation-summary/index.ts`      | Ler email config do banco                              |
| `supabase/functions/whatsapp-webhook/index.ts`               | Ler app_url do banco                                   |
| `supabase/functions/process-whatsapp-notifications/index.ts` | Idem                                                   |
| `supabase/functions/prospect-apify-maps/index.ts`            | Ler apify_api_token do banco                           |
| `supabase/functions/generate-video-shotstack/index.ts`       | Ler shotstack_api_key do banco                         |
| `supabase/functions/shotstack-webhook/index.ts`              | Idem                                                   |

---

## Chunk 1: Banco de Dados — Tabelas system*config*\*

### Task 1: Migration com 8 tabelas + RLS

**Arquivo:** `supabase/migrations/20260416100000_system_config_tables.sql`

- [ ] **Criar a migration:**

```sql
-- ============================================================
-- system_config_* — Configurações globais do sistema para self-hosting
-- Todas as tabelas são singleton (uma linha por instalação)
-- Acesso restrito a owners via RLS
-- ============================================================

-- Função helper para verificar se usuário é owner de qualquer empresa
CREATE OR REPLACE FUNCTION is_system_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = auth.uid()
    AND role = 'owner'
  );
$$;

-- ── Aplicação ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_url text,
  app_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_app ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage app config" ON system_config_app
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_app TO authenticated;

-- ── Facebook / Meta ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_facebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text,
  app_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_facebook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage facebook config" ON system_config_facebook
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_facebook TO authenticated;

-- ── Google ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_google (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ads_client_id text,
  ads_client_secret text,
  ads_developer_token text,
  meet_client_id text,
  meet_client_secret text,
  youtube_api_key text,
  gcp_service_account_json text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_google ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage google config" ON system_config_google
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_google TO authenticated;

-- ── Inteligência Artificial ───────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openrouter_api_key text,
  openai_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_ai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage ai config" ON system_config_ai
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_ai TO authenticated;

-- ── Email ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_api_key text,
  from_email text,
  from_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage email config" ON system_config_email
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_email TO authenticated;

-- ── Ferramentas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apify_api_token text,
  firecrawl_api_key text,
  shotstack_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage tools config" ON system_config_tools
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_tools TO authenticated;

-- ── Discord ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_discord (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_discord ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage discord config" ON system_config_discord
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_discord TO authenticated;

-- ── GitHub ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config_github (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pat text,
  repo_owner text,
  repo_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_config_github ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage github config" ON system_config_github
  FOR ALL USING (is_system_owner()) WITH CHECK (is_system_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_github TO authenticated;
```

- [ ] **Aplicar a migration via Supabase MCP:**

Use `mcp__plugin_supabase_supabase__apply_migration` com o SQL acima.

- [ ] **Verificar:** As 8 tabelas aparecem em `mcp__plugin_supabase_supabase__list_tables`. A função `is_system_owner()` foi criada.

- [ ] **Commit:**

```bash
git add supabase/migrations/20260416100000_system_config_tables.sql
git commit -m "feat: add system_config_* tables for self-hosting configuration"
```

---

## Chunk 2: Edge Functions — Helper Compartilhado

### Task 2: Criar \_shared/getSystemConfig.ts

**Arquivo:** `supabase/functions/_shared/getSystemConfig.ts`

- [ ] **Criar o arquivo:**

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Lê configuração de sistema do banco para uma integração específica.
 * Retorna null se não configurado (não lança erro).
 *
 * @param supabase - Cliente Supabase com service role key
 * @param provider - Nome do provedor: "app" | "facebook" | "google" | "ai" | "email" | "tools" | "discord" | "github"
 */
export async function getSystemConfig<T = Record<string, string | null>>(
  supabase: SupabaseClient,
  provider: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from(`system_config_${provider}`)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(
      `[getSystemConfig] Erro ao ler system_config_${provider}:`,
      error.message,
    );
    return null;
  }

  return data as T | null;
}

/**
 * Determina a URL base da aplicação.
 * Prioridade: config.app_url > header Origin do request > fallback.
 */
export function getAppUrl(
  appConfig: { app_url?: string | null } | null,
  req: Request,
  fallback = "http://localhost:8080",
): string {
  return appConfig?.app_url ?? req.headers.get("origin") ?? fallback;
}
```

- [ ] **Commit:**

```bash
git add supabase/functions/_shared/getSystemConfig.ts
git commit -m "feat: add getSystemConfig shared helper for edge functions"
```

---

## Chunk 3: Edge Functions — Migração de Configurações

### Task 3: Migrar ai-gateway.ts

**Arquivo:** `supabase/functions/_shared/ai-gateway.ts`

A função `callAI` dentro do ai-gateway usa `Deno.env.get("OPENROUTER_API_KEY")`. Precisa ler do banco quando a env var não estiver presente.

- [ ] **Localizar onde OPENROUTER_API_KEY é usada no arquivo** (buscar `Deno.env.get("OPENROUTER_API_KEY")`)

- [ ] **Modificar para ler do banco como fallback:**

```typescript
// Adicionar import no topo
import { getSystemConfig } from "./getSystemConfig.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Função helper para obter a API key
async function getOpenRouterApiKey(): Promise<string> {
  // Tentar env var primeiro (backward compat)
  const envKey = Deno.env.get("OPENROUTER_API_KEY");
  if (envKey) return envKey;

  // Fallback: ler do banco
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const config = await getSystemConfig<{ openrouter_api_key: string }>(
    supabase,
    "ai",
  );
  if (!config?.openrouter_api_key) {
    throw new Error(
      "OpenRouter API key não configurada. Configure em Configurações > Sistema > IA.",
    );
  }
  return config.openrouter_api_key;
}
```

- [ ] Substituir `Deno.env.get("OPENROUTER_API_KEY")` pelo `await getOpenRouterApiKey()` onde for usado.

- [ ] **Commit:**

```bash
git add supabase/functions/_shared/ai-gateway.ts
git commit -m "feat: ai-gateway reads openrouter key from system_config_ai with env fallback"
```

---

### Task 4: Migrar facebook-oauth

**Arquivo:** `supabase/functions/facebook-oauth/index.ts`

- [ ] **Ler a função atual** para entender onde usa `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, e o domínio hardcoded.

- [ ] **Substituir Deno.env.get por getSystemConfig:**

```typescript
import { getSystemConfig, getAppUrl } from "../_shared/getSystemConfig.ts";

// Dentro do handler:
const fbConfig = await getSystemConfig<{ app_id: string; app_secret: string }>(
  supabase,
  "facebook",
);
const appConfig = await getSystemConfig<{ app_url: string }>(supabase, "app");

const appId = Deno.env.get("FACEBOOK_APP_ID") ?? fbConfig?.app_id;
const appSecret = Deno.env.get("FACEBOOK_APP_SECRET") ?? fbConfig?.app_secret;
const appUrl = getAppUrl(appConfig, req);
```

- [ ] **Remover qualquer `if (origin.includes("expxflow.com.br") || origin.includes("controledetrafego.com.br"))` hardcoded.** Substituir por:

```typescript
const redirectUri = `${appUrl}/auth/callback`;
```

- [ ] **Deploy:**

```bash
supabase functions deploy facebook-oauth
```

- [ ] **Commit:**

```bash
git add supabase/functions/facebook-oauth/index.ts
git commit -m "feat: facebook-oauth reads config from system_config_facebook/app"
```

---

### Task 5: Migrar fetch-facebook-pages e webhooks Meta

**Arquivos:**

- `supabase/functions/fetch-facebook-pages/index.ts`
- `supabase/functions/meta-whatsapp-webhook/index.ts`
- `supabase/functions/instagram-messaging-webhook/index.ts`

Para cada um:

- [ ] **Ler o arquivo** e localizar `Deno.env.get("FACEBOOK_APP_*")` ou `FACEBOOK_APP_SECRET`.

- [ ] **Aplicar o mesmo padrão da Task 4** — `getSystemConfig(supabase, "facebook")` com fallback para env var:

```typescript
const fbConfig = await getSystemConfig(supabase, "facebook");
const appSecret = Deno.env.get("FACEBOOK_APP_SECRET") ?? fbConfig?.app_secret;
const appId = Deno.env.get("FACEBOOK_APP_ID") ?? fbConfig?.app_id;
```

- [ ] **Deploy das 3 funções:**

```bash
supabase functions deploy fetch-facebook-pages
supabase functions deploy meta-whatsapp-webhook
supabase functions deploy instagram-messaging-webhook
```

- [ ] **Commit:**

```bash
git add supabase/functions/fetch-facebook-pages/index.ts \
        supabase/functions/meta-whatsapp-webhook/index.ts \
        supabase/functions/instagram-messaging-webhook/index.ts
git commit -m "feat: meta edge functions read config from system_config_facebook"
```

---

### Task 6: Migrar funções de email

**Arquivos:**

- `supabase/functions/resend-employee-invite/index.ts`
- `supabase/functions/invite-employee/index.ts`
- `supabase/functions/create-employee-user/index.ts`
- `supabase/functions/invite-with-magic-link/index.ts`
- `supabase/functions/send-presentation-summary/index.ts`

Para cada um:

- [ ] **Ler o arquivo** e localizar `RESEND_API_KEY`, `from_email` hardcoded (`sistema@controledetrafego.com.br`, `noreply@expxflow.com.br`), e URLs hardcoded de domínio.

- [ ] **Aplicar padrão:**

```typescript
import { getSystemConfig, getAppUrl } from "../_shared/getSystemConfig.ts";

const emailConfig = await getSystemConfig<{
  resend_api_key: string;
  from_email: string;
  from_name: string;
}>(supabase, "email");
const appConfig = await getSystemConfig<{ app_url: string }>(supabase, "app");

const resendKey = Deno.env.get("RESEND_API_KEY") ?? emailConfig?.resend_api_key;
const fromEmail = emailConfig?.from_email ?? "noreply@seudominio.com";
const fromName = emailConfig?.from_name ?? "Sistema";
const appUrl = getAppUrl(appConfig, req);
```

- [ ] **Substituir URLs hardcoded** (`https://controledetrafego.com.br/`, `https://expxflow.com.br/`) por `appUrl`.

- [ ] **Deploy das 5 funções:**

```bash
supabase functions deploy resend-employee-invite
supabase functions deploy invite-employee
supabase functions deploy create-employee-user
supabase functions deploy invite-with-magic-link
supabase functions deploy send-presentation-summary
```

- [ ] **Commit:**

```bash
git add supabase/functions/resend-employee-invite/index.ts \
        supabase/functions/invite-employee/index.ts \
        supabase/functions/create-employee-user/index.ts \
        supabase/functions/invite-with-magic-link/index.ts \
        supabase/functions/send-presentation-summary/index.ts
git commit -m "feat: email edge functions read config from system_config_email, app_url dynamic"
```

---

### Task 7: Migrar funções com app_url (WhatsApp + notificações)

**Arquivos:**

- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/process-whatsapp-notifications/index.ts`

- [ ] **Ler cada arquivo** e localizar URLs `https://controledetrafego.com.br` usadas em links enviados por WhatsApp.

- [ ] **Aplicar padrão:**

```typescript
import { getSystemConfig, getAppUrl } from "../_shared/getSystemConfig.ts";

const appConfig = await getSystemConfig<{ app_url: string }>(supabase, "app");
const appUrl = getAppUrl(appConfig, req);
// Usar appUrl nos links
```

- [ ] **Deploy:**

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy process-whatsapp-notifications
```

- [ ] **Commit:**

```bash
git add supabase/functions/whatsapp-webhook/index.ts \
        supabase/functions/process-whatsapp-notifications/index.ts
git commit -m "feat: whatsapp functions use dynamic app_url from system_config_app"
```

---

### Task 8: Migrar funções de ferramentas

**Arquivos:**

- `supabase/functions/prospect-apify-maps/index.ts`
- `supabase/functions/generate-video-shotstack/index.ts`
- `supabase/functions/shotstack-webhook/index.ts`

- [ ] **Ler cada arquivo** e localizar `APIFY_API_TOKEN`, `SHOTSTACK_API_KEY`.

- [ ] **Aplicar padrão:**

```typescript
import { getSystemConfig } from "../_shared/getSystemConfig.ts";

const toolsConfig = await getSystemConfig<{
  apify_api_token: string;
  shotstack_api_key: string;
}>(supabase, "tools");

const apifyToken =
  Deno.env.get("APIFY_API_TOKEN") ?? toolsConfig?.apify_api_token;
const shotstackKey =
  Deno.env.get("SHOTSTACK_API_KEY") ?? toolsConfig?.shotstack_api_key;
```

- [ ] **Deploy:**

```bash
supabase functions deploy prospect-apify-maps
supabase functions deploy generate-video-shotstack
supabase functions deploy shotstack-webhook
```

- [ ] **Commit:**

```bash
git add supabase/functions/prospect-apify-maps/index.ts \
        supabase/functions/generate-video-shotstack/index.ts \
        supabase/functions/shotstack-webhook/index.ts
git commit -m "feat: tool edge functions read config from system_config_tools"
```

---

## Chunk 4: Frontend — Remover Hardcoding

### Task 9: Corrigir supabase client.ts e publicClient.ts

**Arquivos:**

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/publicClient.ts`

- [ ] **Ler `client.ts`** e verificar se há constantes hardcoded além das que já usam `import.meta.env`.

- [ ] **Garantir que ambos usam apenas variáveis de ambiente:**

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Remover qualquer string literal com o project ID (`ejwpfztkspbvmuwwiwmk`).

- [ ] **Commit:**

```bash
git add src/integrations/supabase/client.ts src/integrations/supabase/publicClient.ts
git commit -m "fix: supabase clients use only env vars, no hardcoded project URLs"
```

---

### Task 10: Corrigir useWhatsAppMediaCache.ts

**Arquivo:** `src/hooks/useWhatsAppMediaCache.ts`

- [ ] **Ler o arquivo** e localizar `const SUPABASE_URL = "https://ejwpfztkspbvmuwwiwmk..."`.

- [ ] **Substituir:**

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
```

- [ ] **Commit:**

```bash
git add src/hooks/useWhatsAppMediaCache.ts
git commit -m "fix: useWhatsAppMediaCache uses VITE_SUPABASE_URL env var"
```

---

### Task 11: Corrigir webhook URLs em componentes

**Arquivos:**

- `src/components/whatsapp/MetaConnectionCard.tsx`
- `src/components/instagram/InstagramKeywordAutomation.tsx`
- `src/hooks/useWebhookTokens.tsx`
- `src/pages/DashboardTrafegoPublic.tsx`

Para cada arquivo:

- [ ] **Ler o arquivo** e localizar URLs com `ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/`.

- [ ] **Substituir pela construção dinâmica:**

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const webhookUrl = `${supabaseUrl}/functions/v1/nome-da-funcao`;
```

- [ ] **Commit:**

```bash
git add src/components/whatsapp/MetaConnectionCard.tsx \
        src/components/instagram/InstagramKeywordAutomation.tsx \
        src/hooks/useWebhookTokens.tsx \
        src/pages/DashboardTrafegoPublic.tsx
git commit -m "fix: webhook URLs generated from VITE_SUPABASE_URL, no hardcoded project IDs"
```

---

### Task 12: Corrigir useFacebookIntegration.tsx

**Arquivo:** `src/hooks/useFacebookIntegration.tsx`

Este arquivo tem dois problemas: `facebookAppId` hardcoded e fallback de domínio hardcoded.

- [ ] **Ler o arquivo** para entender a estrutura.

- [ ] **Criar hook de leitura do App ID do Facebook** — ao invés de buscar via useQuery direto no componente, ler de `system_config_facebook`. Adicionar ao início do hook:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Dentro do useFacebookIntegration hook:
const { data: fbSystemConfig } = useQuery({
  queryKey: ["system_config", "facebook"],
  queryFn: async () => {
    const { data } = await supabase
      .from("system_config_facebook")
      .select("app_id")
      .maybeSingle();
    return data;
  },
});

const facebookAppId = fbSystemConfig?.app_id ?? "";
```

- [ ] **Remover o `facebookAppId` hardcoded** (linha com `"1118192076871259"`).

- [ ] **Corrigir o fallback de domínio** — remover a lógica:

```typescript
// REMOVER este bloco inteiro:
if (
  origin.includes("expxflow.com.br") ||
  origin.includes("controledetrafego.com.br")
) {
  redirectUri = `${origin}/auth/callback`;
} else {
  redirectUri = "https://expxflow.com.br/auth/callback";
}
```

- [ ] **Substituir por:**

```typescript
const redirectUri = `${window.location.origin}/auth/callback`;
```

- [ ] **Commit:**

```bash
git add src/hooks/useFacebookIntegration.tsx
git commit -m "fix: useFacebookIntegration reads app_id from system_config, uses window.location.origin"
```

---

## Chunk 5: UI — Hook + Página de Configurações do Sistema

### Task 13: Criar hook useSystemConfig

**Arquivo:** `src/hooks/useSystemConfig.ts`

- [ ] **Criar o arquivo:**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SystemConfigProvider =
  | "app"
  | "facebook"
  | "google"
  | "ai"
  | "email"
  | "tools"
  | "discord"
  | "github";

export function useSystemConfig(provider: SystemConfigProvider) {
  return useQuery({
    queryKey: ["system_config", provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(`system_config_${provider}`)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, string> | null;
    },
  });
}

export function useUpsertSystemConfig(provider: SystemConfigProvider) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      // Remove campos vazios para não sobrescrever com null
      const cleanValues = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== ""),
      );

      const { data: existing } = await supabase
        .from(`system_config_${provider}`)
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from(`system_config_${provider}`)
          .update({ ...cleanValues, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(`system_config_${provider}`)
          .insert(cleanValues);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_config", provider] });
      toast.success("Configurações salvas com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });
}
```

- [ ] **Commit:**

```bash
git add src/hooks/useSystemConfig.ts
git commit -m "feat: add useSystemConfig and useUpsertSystemConfig hooks"
```

---

### Task 14: Criar SystemConfigSettings.tsx

**Arquivo:** `src/components/settings/SystemConfigSettings.tsx`

Este componente usa o mesmo padrão do `ExternalApiKeysSettings.tsx` — formulários com campos de senha com toggle show/hide.

- [ ] **Criar o arquivo:**

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { useSystemConfig, useUpsertSystemConfig } from "@/hooks/useSystemConfig";
import { useCompany } from "@/contexts/CompanyContext";

// ── Campo com toggle de visibilidade ────────────────────────
function SecretField({
  label,
  name,
  register,
  placeholder,
}: {
  label: string;
  name: string;
  register: ReturnType<typeof useForm>["register"];
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder ?? "••••••••"}
          {...register(name)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Formulário genérico por integração ──────────────────────
function ConfigForm({
  provider,
  title,
  description,
  fields,
}: {
  provider: Parameters<typeof useSystemConfig>[0];
  title: string;
  description: string;
  fields: { name: string; label: string; secret?: boolean; multiline?: boolean; placeholder?: string }[];
}) {
  const { data, isLoading } = useSystemConfig(provider);
  const { mutate, isPending } = useUpsertSystemConfig(provider);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {},
    values: data ?? {},
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => mutate(values as Record<string, string>))}
          className="space-y-4"
        >
          {fields.map((field) =>
            field.multiline ? (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder ?? "Cole o JSON aqui..."}
                  rows={6}
                  {...register(field.name)}
                />
              </div>
            ) : field.secret ? (
              <SecretField
                key={field.name}
                label={field.label}
                name={field.name}
                register={register}
                placeholder={field.placeholder}
              />
            ) : (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  {...register(field.name)}
                />
              </div>
            )
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Página principal ─────────────────────────────────────────
export const SystemConfigSettings = () => {
  const { activeCompany } = useCompany();

  // Apenas owners acessam esta tela — verificação adicional no frontend
  if (activeCompany?.role !== "owner") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Apenas administradores (owners) podem acessar as configurações do sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
        <p className="text-sm text-muted-foreground">
          Configure as integrações globais da instalação. Estas configurações se aplicam a toda a plataforma.
        </p>
      </div>

      <Tabs defaultValue="app">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="app">Aplicação</TabsTrigger>
          <TabsTrigger value="facebook">Facebook / Meta</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="ai">Inteligência IA</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="tools">Ferramentas</TabsTrigger>
          <TabsTrigger value="discord">Discord</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="mt-4">
          <ConfigForm
            provider="app"
            title="Aplicação"
            description="Configurações gerais da instalação."
            fields={[
              { name: "app_name", label: "Nome da Aplicação", placeholder: "Ex: Minha Plataforma" },
              { name: "app_url", label: "URL da Aplicação", placeholder: "https://meudominio.com.br" },
            ]}
          />
        </TabsContent>

        <TabsContent value="facebook" className="mt-4">
          <ConfigForm
            provider="facebook"
            title="Facebook / Meta"
            description="Credenciais do seu Facebook App para integração com Facebook Ads e WhatsApp."
            fields={[
              { name: "app_id", label: "App ID", placeholder: "Ex: 1234567890123456" },
              { name: "app_secret", label: "App Secret", secret: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="google" className="mt-4">
          <ConfigForm
            provider="google"
            title="Google"
            description="Credenciais para Google Ads, Google Meet, YouTube e Google Cloud Platform."
            fields={[
              { name: "ads_client_id", label: "Google Ads – Client ID" },
              { name: "ads_client_secret", label: "Google Ads – Client Secret", secret: true },
              { name: "ads_developer_token", label: "Google Ads – Developer Token", secret: true },
              { name: "meet_client_id", label: "Google Meet – Client ID" },
              { name: "meet_client_secret", label: "Google Meet – Client Secret", secret: true },
              { name: "youtube_api_key", label: "YouTube – API Key", secret: true },
              { name: "gcp_service_account_json", label: "GCP – Service Account JSON", multiline: true, placeholder: '{"type": "service_account", ...}' },
            ]}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <ConfigForm
            provider="ai"
            title="Inteligência Artificial"
            description="Chaves de API para os modelos de IA utilizados na plataforma."
            fields={[
              { name: "openrouter_api_key", label: "OpenRouter – API Key", secret: true },
              { name: "openai_api_key", label: "OpenAI – API Key", secret: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <ConfigForm
            provider="email"
            title="Email"
            description="Configurações de envio de email (convites, notificações)."
            fields={[
              { name: "resend_api_key", label: "Resend – API Key", secret: true },
              { name: "from_email", label: "Email de Envio (From)", placeholder: "noreply@seudominio.com" },
              { name: "from_name", label: "Nome do Remetente", placeholder: "Sua Plataforma" },
            ]}
          />
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <ConfigForm
            provider="tools"
            title="Ferramentas"
            description="Chaves para ferramentas de automação e geração de mídia."
            fields={[
              { name: "apify_api_token", label: "Apify – API Token", secret: true },
              { name: "firecrawl_api_key", label: "FireCrawl – API Key", secret: true },
              { name: "shotstack_api_key", label: "Shotstack – API Key", secret: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="discord" className="mt-4">
          <ConfigForm
            provider="discord"
            title="Discord"
            description="Token do bot Discord para notificações."
            fields={[
              { name: "bot_token", label: "Bot Token", secret: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="github" className="mt-4">
          <ConfigForm
            provider="github"
            title="GitHub"
            description="Acesso ao repositório GitHub para integrações de automação."
            fields={[
              { name: "pat", label: "Personal Access Token (PAT)", secret: true },
              { name: "repo_owner", label: "Owner do Repositório", placeholder: "usuario-ou-org" },
              { name: "repo_name", label: "Nome do Repositório", placeholder: "nome-do-repo" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

- [ ] **Commit:**

```bash
git add src/components/settings/SystemConfigSettings.tsx
git commit -m "feat: add SystemConfigSettings component with tabs for all integrations"
```

---

### Task 15: Registrar rota e entrada no menu

**Arquivos:**

- `src/pages/Configuracoes.tsx`
- `src/components/settings/SettingsLayout.tsx`

- [ ] **Em `Configuracoes.tsx`**, adicionar import e rota:

```typescript
import { SystemConfigSettings } from "@/components/settings/SystemConfigSettings";

// Dentro de <Routes>:
<Route path="sistema" element={<SystemConfigSettings />} />
```

- [ ] **Em `SettingsLayout.tsx`**, adicionar item ao `settingsNavItems` array:

```typescript
import { Settings2 } from "lucide-react";

// No array settingsNavItems, adicionar:
{
  title: "Sistema",
  href: "/configuracoes/sistema",
  icon: Settings2,
  description: "Configurações globais de integrações",
},
```

- [ ] **Adicionar `Settings2` ao import do lucide-react** na linha de imports existente.

- [ ] **Verificação manual:** Acessar `/configuracoes/sistema` no browser. A página deve carregar com as 8 tabs. Preencher um campo (ex: app_name) e salvar. Verificar no Supabase que a linha foi criada em `system_config_app`.

- [ ] **Commit:**

```bash
git add src/pages/Configuracoes.tsx src/components/settings/SettingsLayout.tsx
git commit -m "feat: add /configuracoes/sistema route and nav entry for system config"
```

---

## Verificação Final

- [ ] **Build sem erros:** `npm run build` — nenhum TypeScript ou import quebrado.
- [ ] **Sem strings `ejwpfztkspbvmuwwiwmk` no bundle:** `grep -r "ejwpfztkspbvmuwwiwmk" src/` deve retornar vazio.
- [ ] **Sem domínios hardcoded:** `grep -r "controledetrafego.com.br\|expxflow.com.br" src/` deve retornar vazio.
- [ ] **Fluxo owner:** Logar como owner → ir em Configurações → Sistema → salvar configuração de email → verificar toast de sucesso.
- [ ] **Fluxo não-owner:** Logar como colaborador → a rota `/configuracoes/sistema` deve mostrar mensagem de acesso negado.

- [ ] **Commit final se tudo ok:**

```bash
git commit --allow-empty -m "chore: self-hosting configuration complete — all hardcoded values removed"
```
