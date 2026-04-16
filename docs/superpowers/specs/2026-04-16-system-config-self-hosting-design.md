# Design: Configurações do Sistema para Self-Hosting

**Data:** 2026-04-16  
**Status:** Aprovado

## Contexto

O projeto será distribuído como código-fonte para clientes que farão self-hosting. Atualmente existem múltiplas camadas de hardcoding que impedem isso: URLs do projeto Supabase, domínios da ExpxFlow/controledetrafego, Facebook App ID, e ~20 chaves de API em variáveis de ambiente das edge functions.

O objetivo é minimizar o `.env` ao essencial e mover todas as configurações de integrações para uma área de "Configurações do Sistema" dentro da aplicação.

---

## Decisões de Design

- **Abordagem:** Tabelas especializadas por integração (uma tabela por provedor)
- **`.env` mínimo:** Apenas `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- **Edge functions:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` são auto-provisionados pelo Supabase, não precisam ser configurados pelo cliente
- **Domínio da aplicação:** Detecção automática via `window.location.origin` (frontend) e header `origin` do request (edge functions), com fallback em `system_config_app.app_url`
- **Acesso:** Apenas `role = 'owner'` pode ler/escrever configurações do sistema

---

## Seção 1: Banco de Dados

### Novas tabelas (singleton — uma linha por tabela)

```sql
-- Configurações gerais da aplicação
CREATE TABLE system_config_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_url text,
  app_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Facebook / Meta
CREATE TABLE system_config_facebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text,
  app_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Google (Ads + Meet + YouTube + GCP)
CREATE TABLE system_config_google (
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

-- Inteligência Artificial
CREATE TABLE system_config_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openrouter_api_key text,
  openai_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email (Resend)
CREATE TABLE system_config_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_api_key text,
  from_email text,
  from_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ferramentas externas
CREATE TABLE system_config_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apify_api_token text,
  firecrawl_api_key text,
  shotstack_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Discord
CREATE TABLE system_config_discord (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GitHub
CREATE TABLE system_config_github (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pat text,
  repo_owner text,
  repo_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS

- Todas as tabelas com RLS habilitado
- Política de leitura/escrita: apenas usuários com `role = 'owner'` em `company_members`
- Usar função `SECURITY DEFINER` para evitar subquery em tabela com RLS dentro de policy
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config_* TO authenticated`

---

## Seção 2: Edge Functions

### Helper compartilhado

```typescript
// supabase/functions/_shared/getSystemConfig.ts
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getSystemConfig<T = Record<string, string>>(
  supabase: SupabaseClient,
  provider: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from(`system_config_${provider}`)
    .select("*")
    .single();
  if (error) return null;
  return data as T;
}

export function getAppUrl(
  config: { app_url?: string } | null,
  req: Request,
): string {
  return (
    config?.app_url ?? req.headers.get("origin") ?? "http://localhost:8080"
  );
}
```

### Padrão de migração por edge function

```typescript
// Antes
const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
const appId = Deno.env.get("FACEBOOK_APP_ID");

// Depois
const fbConfig = await getSystemConfig(supabase, "facebook");
const appSecret = fbConfig?.app_secret;
const appId = fbConfig?.app_id;
```

```typescript
// URLs de domínio — antes
const appUrl = "https://controledetrafego.com.br";

// Depois
const appConfig = await getSystemConfig(supabase, "app");
const appUrl = getAppUrl(appConfig, req);
```

### Edge functions a migrar

| Edge Function                    | Configs a migrar                     |
| -------------------------------- | ------------------------------------ |
| `facebook-oauth`                 | `system_config_facebook` + `app_url` |
| `fetch-facebook-pages`           | `system_config_facebook`             |
| `meta-whatsapp-webhook`          | `system_config_facebook`             |
| `instagram-messaging-webhook`    | `system_config_facebook`             |
| `google-ads-*`                   | `system_config_google`               |
| `transcribe-audio`               | `system_config_google` (GCP)         |
| `generate-reels-video`           | `system_config_google` (GCP)         |
| `ia-agent-chat`                  | `system_config_ai`                   |
| `resend-employee-invite`         | `system_config_email` + `app_url`    |
| `invite-employee`                | `system_config_email` + `app_url`    |
| `create-employee-user`           | `system_config_email` + `app_url`    |
| `invite-with-magic-link`         | `system_config_email` + `app_url`    |
| `send-presentation-summary`      | `system_config_email`                |
| `prospect-apify-maps`            | `system_config_tools` (apify)        |
| `generate-video-shotstack`       | `system_config_tools` (shotstack)    |
| `shotstack-webhook`              | `system_config_tools` (shotstack)    |
| `discord-*`                      | `system_config_discord`              |
| `github-*`                       | `system_config_github`               |
| `whatsapp-webhook`               | `app_url`                            |
| `process-whatsapp-notifications` | `app_url`                            |

---

## Seção 3: Frontend

### Hook centralizado

```typescript
// src/hooks/useSystemConfig.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemConfig(provider: string) {
  return useQuery({
    queryKey: ["system_config", provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(`system_config_${provider}`)
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found (ok)
      return data;
    },
  });
}

export function useUpsertSystemConfig(provider: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data: existing } = await supabase
        .from(`system_config_${provider}`)
        .select("id")
        .single();

      if (existing) {
        await supabase
          .from(`system_config_${provider}`)
          .update(values)
          .eq("id", existing.id);
      } else {
        await supabase.from(`system_config_${provider}`).insert(values);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["system_config", provider] }),
  });
}
```

### Arquivos frontend com hardcoding a corrigir

| Arquivo                                                   | Problema                                     | Solução                                                  |
| --------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `src/integrations/supabase/client.ts`                     | Constantes duplicadas de URL/key             | Usar apenas `import.meta.env.VITE_SUPABASE_URL`          |
| `src/integrations/supabase/publicClient.ts`               | Idem                                         | Idem                                                     |
| `src/hooks/useWhatsAppMediaCache.ts`                      | `SUPABASE_URL` hardcoded                     | `import.meta.env.VITE_SUPABASE_URL`                      |
| `src/hooks/useFacebookIntegration.tsx`                    | `facebookAppId` hardcoded + domínio fallback | `useSystemConfig('facebook')` + `window.location.origin` |
| `src/components/whatsapp/MetaConnectionCard.tsx`          | Webhook URL com project ID hardcoded         | `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/...`  |
| `src/components/instagram/InstagramKeywordAutomation.tsx` | Idem                                         | Idem                                                     |
| `src/hooks/useWebhookTokens.tsx`                          | Idem                                         | Idem                                                     |
| `src/pages/DashboardTrafegoPublic.tsx`                    | URL de edge function hardcoded               | Idem                                                     |

---

## Seção 4: UI — /configuracoes/sistema

### Rota

- Path: `/configuracoes/sistema`
- Proteção: `PermissionProtectedRoute` com permissão `configuracoes` + verificação de `role = 'owner'`
- Posição no menu de configurações: nova entrada "Configurações do Sistema"

### Estrutura de tabs

```
Configurações do Sistema
├── Aplicação        → app_url, app_name
├── Facebook / Meta  → app_id, app_secret
├── Google           → ads_client_id, ads_client_secret, ads_developer_token,
│                      meet_client_id, meet_client_secret, youtube_api_key,
│                      gcp_service_account_json
├── Inteligência IA  → openrouter_api_key, openai_api_key
├── Email            → resend_api_key, from_email, from_name
├── Ferramentas      → apify_api_token, firecrawl_api_key, shotstack_api_key
├── Discord          → bot_token
└── GitHub           → pat, repo_owner, repo_name
```

### Comportamento por formulário

- Campos de secret: input `type="password"` com botão toggle show/hide
- Ao carregar: busca configuração existente e pré-preenche o formulário
- Ao salvar: upsert na tabela correspondente, toast de sucesso/erro
- GCP Service Account: textarea para colar o JSON completo

---

## Resumo do Escopo

| Camada                    | Quantidade de mudanças                   |
| ------------------------- | ---------------------------------------- |
| `.env`                    | Reduz de ~26 variáveis para 2 (frontend) |
| Migrations                | 8 novas tabelas + RLS + GRANT            |
| Edge Functions            | 1 helper + ~20 funções migradas          |
| Frontend hooks/components | 7 arquivos com hardcoding + 1 hook novo  |
| UI                        | 1 nova página + 8 formulários            |
