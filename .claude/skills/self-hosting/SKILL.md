---
name: self-hosting
description: Use ao trabalhar com self-hosting — padrão env > banco para credenciais globais, helper getSystemConfig, tabelas system_config_*, UI /configuracoes/sistema, e verificação de hardcode (spec §10). Aplica ao adicionar nova integração, ajustar credencial global, ou criar Edge Function que lê secret.
---

# Self-Hosting — Padrão de Credenciais Globais

## Quando usar

- Criar Edge Function que precise de credenciais (API keys, OAuth, secrets)
- Adicionar nova integração global ao sistema
- Modificar `system_config_*` (tabelas ou UI)
- Mudar URLs hardcoded em código
- Validar que mudanças não vazam dados do dev original

## Arquitetura

```
Edge Function
   │
   ├─ Deno.env.get("XPTO_API_KEY")           ← 1ª prioridade (env var)
   │
   ├─ getSystemConfig(supabase, "X")          ← 2ª prioridade (banco, editável via UI)
   │       │
   │       └─ Tabela system_config_X (singleton id=1, RLS owner-only)
   │
   └─ Nenhum dos dois → Erro graceful PT-BR    ← Aponta para /configuracoes/sistema
```

## Helper compartilhado

`supabase/functions/_shared/getSystemConfig.ts`:

```typescript
import {
  getSystemConfig,
  getAppUrl,
  buildAppLink,
  resolveCredential,
  resolveCredentialOptional,
} from "../_shared/getSystemConfig.ts";

// Obrigatória (lança se ambos ausentes)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const cfg = await getSystemConfig(supabase, "ai");
const apiKey = resolveCredential(
  Deno.env.get("OPENROUTER_API_KEY"),
  cfg?.openrouter_api_key,
  "OpenRouter API Key não configurada. Acesse Configurações > Sistema > IA.",
);

// Opcional (retorna null, não lança — para integrações desligáveis como GitHub/Discord)
const ghCfg = await getSystemConfig(supabase, "github");
const owner = resolveCredentialOptional(
  Deno.env.get("GITHUB_REPO_OWNER"),
  ghCfg?.repo_owner,
);
if (!owner) {
  return new Response(
    JSON.stringify({ error: "Integração GitHub não configurada." }),
    { status: 503 },
  );
}

// URL da instalação (sem domínio hardcoded)
const appCfg = await getSystemConfig(supabase, "app");
const redirectUrl = buildAppLink(appCfg, req, "/auth/callback");
```

## Tabelas system*config*\* (singleton)

8 tabelas, todas com `id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1)`:

| Tabela                   | Campos                                                                                                                                             | Quando usar                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `system_config_app`      | `app_url`, `app_name`                                                                                                                              | URLs/redirects/nomes em emails                             |
| `system_config_facebook` | `app_id`, `app_secret`, `graph_api_version` (default v21.0)                                                                                        | OAuth Facebook                                             |
| `system_config_google`   | `ads_client_id`, `ads_client_secret`, `ads_developer_token`, `meet_client_id`, `meet_client_secret`, `youtube_api_key`, `gcp_service_account_json` | Google Ads/Meet/YouTube/Slides                             |
| `system_config_ai`       | `openrouter_api_key`, `openai_api_key`                                                                                                             | Fallback global de IA                                      |
| `system_config_email`    | `resend_api_key`, `from_email`, `from_name`                                                                                                        | Convites, notificações                                     |
| `system_config_tools`    | `apify_api_token`, `firecrawl_api_key`, `shotstack_api_key`, `youtube_proxy_url`, `api4com_base_url`                                               | Ferramentas externas                                       |
| `system_config_discord`  | `bot_token`                                                                                                                                        | Fallback Discord (per-tenant continua em `discord_config`) |
| `system_config_github`   | `pat`, `repo_owner`, `repo_name`                                                                                                                   | Issue tracking (opcional)                                  |

**RLS:** Todas com `policy FOR ALL TO authenticated USING (is_system_owner()) WITH CHECK (is_system_owner())`.
**Função:** `public.is_system_owner()` retorna `true` para `role='owner'` OU primeiro user criado.

## Frontend

- **Hook:** `useSystemConfig(provider)` + `useUpsertSystemConfig(provider)` em `src/hooks/useSystemConfig.ts`
- **UI:** `/configuracoes/sistema` — 8 abas (app, ai, facebook, google, email, tools, discord, github)
- **Acesso:** Somente system owner (`useIsSystemOwner()`)
- **SecretField:** Senhas não são exibidas; deixar vazio = manter atual

## Frontend — env vars obrigatórias

Apenas 2 variáveis são lidas no frontend (precisa antes do React carregar):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-jwt>
```

OAuth Client IDs adicionais são **opcionais**:

- `VITE_FACEBOOK_APP_ID`, `VITE_GOOGLE_ADS_CLIENT_ID`, `VITE_GOOGLE_MEET_CLIENT_ID`

**NUNCA use** `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy). Padronizado em `VITE_SUPABASE_ANON_KEY`.

## Storage key dinâmica

`src/integrations/supabase/client.ts` deriva `sb-<ref>-auth-token` do host da URL:

```typescript
const PROJECT_REF = extractProjectRef(SUPABASE_URL);
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
```

## URLs de webhook e Edge Functions no frontend

Use sempre `functionUrl("nome-da-funcao")` de `src/integrations/supabase/runtime.ts`.
NUNCA construa URL hardcoded.

## Cron jobs

`supabase/functions/setup-cron-jobs/index.ts` agenda todos os jobs lendo
`SUPABASE_URL`/`SUPABASE_ANON_KEY` do runtime. Cliente roda uma vez:

```sh
supabase functions invoke setup-cron-jobs --no-verify-jwt
```

Os templates `supabase/CONFIGURE_*.sql` usam placeholders `<SUA_SUPABASE_URL>` e
`<SUA_ANON_KEY>` para setup manual.

## Guard test (regressão permanente)

`src/test/guards/no-hardcode.test.ts` falha o build se reaparecer:

1. `ejwpfztkspbvmuwwiwmk` (project ID dev)
2. `controledetrafego.com.br` / `expxflow.com.br` (domínios dev)
3. `1118192076871259` / `1442283340343262` (App IDs Facebook dev)
4. `bittencourtthulio` (username GitHub dev)
5. `refreshing-beauty-production-f560.up.railway.app` (proxy Railway dev)

**Pastas escaneadas:** `src/`, `supabase/functions/`, `supabase/config.toml`, `index.html`, `README.md`.
**Ignora:** histórico de migrations, docs/planos, este próprio arquivo.

## Script de verificação

```sh
bash scripts/verify-self-hosting.sh
```

Retorna `TODOS OS CHECKS PASSARAM` (exit 0) quando o spec §10 está verde.

## Armadilhas comuns

1. **Esquecer `getSystemConfig` em nova função:** ela vira env-only e quebra o UX do cliente.
2. **Lançar erro quando deveria retornar graceful:** para integrações opcionais (GitHub, Discord), use `resolveCredentialOptional` e retorne HTTP 503 informativo, nunca use fallback do dev.
3. **Construir URL com `Deno.env.get("SUPABASE_URL")` direto:** para webhooks/links de email, sempre passe por `buildAppLink(appCfg, req, path)` pois o cliente pode ter domínio próprio diferente do Supabase.
4. **Esquecer RLS em nova tabela singleton:** siga o padrão das `system_config_*` existentes.
5. **Misturar nomes `VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_SUPABASE_ANON_KEY`:** padronize em `ANON_KEY`. O `runtime.ts` faz fallback para compat, mas não use em código novo.
6. **Migrations com seed data de dev:** se uma migration tem INSERT com IDs hardcoded, torne-a condicional com `WHERE EXISTS` ou pule.

## Verificação rápida

```sh
# 1. Frontend limpo?
grep -rE "ejwpfztkspbvmuwwiwmk|controledetrafego\.com\.br|expxflow\.com\.br|bittencourtthulio" src/ | grep -v no-hardcode.test.ts

# 2. Edge Functions limpas?
grep -rE "controledetrafego\.com\.br|expxflow\.com\.br|bittencourtthulio" supabase/functions/

# 3. Script completo
bash scripts/verify-self-hosting.sh
```

Todos devem retornar **vazio** ou **exit 0**.

## Documentação relacionada

- Spec completa: `docs/SPEC_SELF_HOSTING.md`
- Guia de instalação: `docs/INSTALACAO.md`
- Checklist pós-instalação: `docs/CHECKLIST_POS_INSTALACAO.md`
- Plano de orquestração: `docs/superpowers/plans/self-hosting/`
