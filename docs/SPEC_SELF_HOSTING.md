# Spec: Liberação de Fontes para Self-Hosting por Clientes

> **Objetivo:** Permitir que clientes instalem e operem sua própria instância do Expx Flow a partir dos fontes, configurando todas as integrações de terceiros (IA, Meta, Google, WhatsApp, etc.) por conta própria, sem acesso às credenciais do desenvolvedor original.

---

## 1. Sumário Executivo

O projeto hoje mistura **três níveis de configuração**:

| Nível                           | Onde está                                            | Exemplo                                       | Estado para self-hosting                                     |
| ------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| **Hardcoded (código)**          | `src/`, `supabase/functions/`, `*.sql`, `index.html` | URL do Supabase, App ID do Facebook, domínios | **CRÍTICO — deve ser removido**                              |
| **Env vars (Supabase Secrets)** | `Deno.env.get()` nas Edge Functions                  | `OPENROUTER_API_KEY`, `FACEBOOK_APP_SECRET`   | Funciona, mas cliente precisa configurar manualmente via CLI |
| **Banco de dados (per-tenant)** | Tabelas como `ai_api_keys`, `whatsapp_configs`       | Chave OpenRouter da empresa, tokens Uazapi    | **Ideal — já isolado por empresa**                           |

O trabalho consiste em: **eliminar todos os valores hardcoded** e **externalizar todas as configs globais** para que o cliente configure tudo via UI ou `.env`, sem nunca ver dados do projeto original.

---

## 2. Arquitetura-Alvo

```
┌─────────────────────────────────────────────────────────┐
│                   Instância do Cliente                   │
│                                                          │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │   Vercel     │     │     Supabase do Cliente       │  │
│  │  (Frontend)  │────▶│                               │  │
│  │              │     │  PostgreSQL + Edge Functions  │  │
│  │ .env:        │     │  + Auth + Realtime + Storage  │  │
│  │  VITE_SUPAB  │     │                               │  │
│  │  ASE_URL     │     │  system_config_* (tabelas)    │  │
│  │  VITE_SUPAB  │     │  ← Credenciais globais        │  │
│  │  ASE_KEY     │     │     configuradas via UI       │  │
│  └──────────────┘     │                               │  │
│                       │  ai_api_keys, whatsapp_configs │  │
│                       │  ← Creds por empresa (tenant)  │  │
│                       └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Princípios

1. **Únicas env vars do frontend:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY` — ver §6.1 sobre inconsistência de nome)
2. **Todas as demais configs globais** → tabelas `system_config_*` no banco, editáveis via `/configuracoes/sistema`
3. **Configs por empresa (tenant)** → já isoladas em tabelas existentes (`ai_api_keys`, `whatsapp_configs`, `discord_config`, etc.)
4. **Zero valores hardcoded** de domínios, IDs de apps, tokens, chaves ou usernames

---

## 3. Inventario Completo do Que Precisa Mudar

### 3.1. Credenciais Supabase Hardcoded (CRÍTICO)

O project ID `ejwpfztkspbvmuwwiwmk` e a anon key JWT aparecem em **~30 arquivos**. Se liberar os fontes hoje, o bundle do cliente aponta para o Supabase do desenvolvedor.

#### Frontend (`src/`)

| Arquivo                                                   | Linha(s)  | O que está hardcoded                                                                           |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `src/integrations/supabase/client.ts`                     | 5, 7, 107 | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `storageKey: "sb-ejwpfztkspbvmuwwiwmk-auth-token"` |
| `src/integrations/supabase/publicClient.ts`               | 6, 8      | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                                     |
| `src/hooks/useWhatsAppMediaCache.ts`                      | 3         | `SUPABASE_URL` hardcoded                                                                       |
| `src/hooks/useWebhookTokens.tsx`                          | 183       | URL do webhook `webhook-offline-conversion`                                                    |
| `src/components/whatsapp/MetaConnectionCard.tsx`          | 65        | URL do webhook `meta-whatsapp-webhook`                                                         |
| `src/components/instagram/InstagramKeywordAutomation.tsx` | 309       | URL do webhook `instagram-messaging-webhook`                                                   |
| `src/components/settings/ApiKeysSettings.tsx`             | 428, 676  | URLs completas de endpoint da API                                                              |
| `src/pages/DashboardTrafegoPublic.tsx`                    | 159       | URL da edge function `tv-dashboard-data`                                                       |

**Ação:** Trocar todas as ocorrências por `import.meta.env.VITE_SUPABASE_URL`. A storageKey deve ser derivada dinamicamente do project ref extraído da URL.

#### Backend — config e scripts

| Arquivo                                     | O que está hardcoded                   |
| ------------------------------------------- | -------------------------------------- |
| `supabase/config.toml` (L1)                 | `project_id = "ejwpfztkspbvmuwwiwmk"`  |
| `scripts/migrate-carousel-base64.mjs` (L16) | `SUPABASE_URL` hardcoded               |
| `.env` (L1-3)                               | Project ID, URL, anon key JWT completa |

**Ação:** `config.toml` deve ser documentado como "preencher com o project ID do seu Supabase". O `.env` deve ir para `.env.example` com valores placeholder.

#### Backend — Cron SQL e Migrations

Estes arquivos têm a URL do Supabase + Bearer anon key hardcoded como argumentos do `net.http_post` no `pg_cron`:

| Arquivo                                       | Função agendada                                  |
| --------------------------------------------- | ------------------------------------------------ |
| `supabase/CONFIGURE_CRON.sql`                 | `daily-performance-snapshot`                     |
| `supabase/CONFIGURE_WHATSAPP_CRON.sql`        | `process-whatsapp-notifications`                 |
| `supabase/CONFIGURE_WORDPRESS_CRON.sql`       | `wordpress-auto-post-scheduler`                  |
| `supabase/CONFIGURE_SCHEDULED_POSTS_CRON.sql` | `scheduled-post-publisher`                       |
| `supabase/CONFIGURE_AUTOMATION_CRON.md`       | `master-automation-scheduler`                    |
| `supabase/SNAPSHOTS_README.md`                | Documentação com URLs + curl                     |
| `supabase/migrations/20251112015814_...sql`   | `process-recovery-triggers`                      |
| `supabase/migrations/20260103141359_...sql`   | `daily-ad-generator-scheduler`                   |
| `supabase/migrations/20260103141606_...sql`   | `daily-ad-generator-scheduler`                   |
| `supabase/migrations/20260103205038_...sql`   | `daily-creative-generator-scheduler`             |
| `supabase/migrations/20260210142521_...sql`   | `groupops-campaign-cron`                         |
| `supabase/migrations/20260210151451_...sql`   | `groupops-campaign-cron`                         |
| `supabase/migrations/20260220025700_...sql`   | `dm-agent-responder`                             |
| `supabase/migrations/20260220032827_...sql`   | Define `supabase_url`/`anon_key` como constantes |

**Ação:** Estes arquivos devem usar placeholders (`<SUA_SUPABASE_URL>`, `<SUA_ANON_KEY>`) e virar templates. Idealmente, criar uma Edge Function `setup-cron-jobs` ou um script SQL parametrizado que o cliente executa uma única vez após configurar o Supabase.

---

### 3.2. Domínios Hardcoded (CRÍTICO)

Os domínios `controledetrafego.com.br` e `expxflow.com.br` aparecem em **~15 arquivos**, principalmente em:

- URLs de redirect do OAuth
- URLs incluídas em emails e notificações do WhatsApp
- `site_url` e `additional_redirect_urls` no `config.toml` (L131-132)
- User-Agent strings

| Arquivo                                                                                 | Contexto                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/hooks/useFacebookIntegration.tsx` (L42-54)                                         | `facebookAppId` + check de domínio + redirect hardcoded |
| `supabase/functions/facebook-oauth/index.ts` (L48-58)                                   | Mesma lógica espelhada no backend                       |
| `supabase/functions/resend-employee-invite/index.ts` (L120, L148, L162)                 | `redirectTo`, `from` email                              |
| `supabase/functions/invite-employee/index.ts` (L46, L66)                                | `from` email, link no HTML                              |
| `supabase/functions/create-employee-user/index.ts` (L80)                                | `from` email                                            |
| `supabase/functions/invite-with-magic-link/index.ts` (L92, L124, L168)                  | `redirectTo`, `from`, links                             |
| `supabase/functions/send-presentation-summary/index.ts` (L192)                          | `from` email                                            |
| `supabase/functions/whatsapp-webhook/index.ts` (L774-775, L805-806, L896-897, L953-954) | `FRONTEND_URL` fallback ×4                              |
| `supabase/functions/process-whatsapp-notifications/index.ts` (L469, L1063-1064)         | Links sem env fallback                                  |
| `supabase/functions/test-send-notification/index.ts` (L258-259)                         | Links hardcoded                                         |
| `supabase/functions/fetch-webpage-content/index.ts` (L91)                               | User-Agent com domínio                                  |
| `supabase/functions/analyze-carousel-from-url/index.ts` (L82)                           | User-Agent com domínio                                  |
| `supabase/config.toml` (L131-132)                                                       | `site_url`, `additional_redirect_urls`                  |

**Ação:** Todas as URLs de domínio devem ler de `system_config_app.app_url` (ou `Deno.env.get("FRONTEND_URL")` com fallback para config do banco). Emails `from` devem ler de `system_config_email`. O redirect do Facebook OAuth deve usar `window.location.origin` no frontend.

---

### 3.3. App IDs de OAuth Hardcoded (CRÍTICO)

| Serviço            | Arquivo                                      | Valor hardcoded                                      |
| ------------------ | -------------------------------------------- | ---------------------------------------------------- |
| Facebook (OAuth)   | `src/hooks/useFacebookIntegration.tsx` (L42) | `"1118192076871259"`                                 |
| Facebook (JS SDK)  | `index.html` (L28)                           | `'1442283340343262'` — **App ID diferente do acima** |
| Facebook (Backend) | `supabase/functions/facebook-oauth/index.ts` | Lê de env var, mas sem fallback de banco             |
| Google Ads         | `.env` (L4)                                  | `VITE_GOOGLE_ADS_CLIENT_ID`                          |
| Google Meet        | `.env` (L5)                                  | `VITE_GOOGLE_MEET_CLIENT_ID`                         |

**Ação:**

- Facebook App ID: consolidar em um único valor, ler de `system_config_facebook.app_id`
- `index.html`: o FB SDK init deve ser feito via JS dinâmico (ler config do banco) ou via `import.meta.env.VITE_FACEBOOK_APP_ID`
- Google Client IDs: ler de `system_config_google` no backend; o frontend usa `import.meta.env.VITE_GOOGLE_*` ou busca do banco

---

### 3.4. Integrações Google (NÃO coberto pelo plano existente)

As Edge Functions do Google Ads e Google Meet leem credenciais **diretamente de env vars** sem fallback de banco. Para self-hosting, devem ler de `system_config_google`.

#### Google Ads — funções afetadas

| Arquivo                                                       | Env vars usadas                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `supabase/functions/google-ads-oauth/index.ts`                | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` |
| `supabase/functions/sync-google-ads-campaigns/index.ts`       | Mesmas + `_shared/googleAdsTokenRefresh.ts`                                      |
| `supabase/functions/google-ads-fetch-account/index.ts`        | Mesmas                                                                           |
| `supabase/functions/google-ads-keyword-planner/index.ts`      | Mesmas                                                                           |
| `supabase/functions/manage-google-ads-sync-schedule/index.ts` | Mesmas                                                                           |
| `supabase/functions/fetch-realtime-metrics/index.ts`          | Mesmas                                                                           |
| `supabase/functions/_shared/googleAdsTokenRefresh.ts`         | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`                               |

#### Google Meet — funções afetadas

| Arquivo                                                    | Env vars usadas                                      |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `supabase/functions/google-meet-oauth/index.ts`            | `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET` |
| `supabase/functions/google-meet-create/index.ts`           | Mesmas                                               |
| `supabase/functions/google-meet-check-transcript/index.ts` | Mesmas                                               |
| `supabase/functions/google-meet-process-summary/index.ts`  | Mesmas                                               |

#### YouTube Data API

| Arquivo                                               | Env var           |
| ----------------------------------------------------- | ----------------- |
| `supabase/functions/analyze-youtube-channel/index.ts` | `YOUTUBE_API_KEY` |

#### Google Slides Export

| Arquivo                                               | Env var                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `supabase/functions/export-to-google-slides/index.ts` | `GCP_SERVICE_ACCOUNT_JSON` (JSON completo da service account) |

#### Frontend

| Arquivo                                        | Env vars                                     |
| ---------------------------------------------- | -------------------------------------------- |
| `src/hooks/useGoogleAdsIntegration.tsx` (L40)  | `import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID`  |
| `src/hooks/useGoogleMeetIntegration.tsx` (L25) | `import.meta.env.VITE_GOOGLE_MEET_CLIENT_ID` |

**Ação:** Aplicar o mesmo padrão do `getSystemConfig(supabase, "google")` em todas as funções acima, com fallback para env var. Para o frontend, buscar do banco ou adicionar `VITE_GOOGLE_*` ao `.env.example`.

---

### 3.5. GitHub — Username/Repo Hardcoded (NÃO coberto pelo plano existente)

Quatro Edge Functions têm fallback hardcoded com o GitHub pessoal do desenvolvedor:

| Arquivo                                                 | Linha(s) | Fallback                                                                                  |
| ------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `supabase/functions/sync-release-notes/index.ts`        | L158-159 | `GITHUB_REPO_OWNER \|\| "bittencourtthulio"`, `GITHUB_REPO_NAME \|\| "controledetrafego"` |
| `supabase/functions/create-github-issue/index.ts`       | L52-53   | Mesmo                                                                                     |
| `supabase/functions/fetch-github-issue-status/index.ts` | L60-61   | Mesmo                                                                                     |
| `supabase/functions/auto-report-error/index.ts`         | L43-44   | Mesmo                                                                                     |

Também em: `README.md` (L14), `.github/workflows/jules-dispatcher.yml`.

**Ação:** Remover o fallback hardcoded. Usar `system_config_github` (repo_owner, repo_name, pat). Se não configurado, a função deve retornar erro graceful em vez de usar o repo do desenvolvedor. Considerar se esta integração deve ser **opcional/desativável** para clientes que não usam GitHub.

---

### 3.6. URLs de Serviços Terceiros Hardcoded (MÉDIA PRIORIDADE)

Estes não são segredos, mas são URLs que alguns clientes podem precisar customizar:

| Serviço                   | Arquivo                                                                                         | URL hardcoded                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| API4Com                   | `supabase/functions/initiate-voice-call/index.ts` (L92)                                         | `https://api.api4com.com/api/v1/dialer`                              |
| Shotstack proxy (Railway) | `create-clip-job/index.ts`, `generate-reels-video/index.ts`, `generate-video-creative/index.ts` | `https://refreshing-beauty-production-f560.up.railway.app`           |
| Imgur logos               | `index.html` (L5, L14, L17)                                                                     | `https://i.imgur.com/RMzwUaa.png`, `https://i.imgur.com/EVjvxxM.png` |

**Ação:**

- API4Com: adicionar campo `api4com_base_url` em `whatsapp_configs` (ou `system_config`) com default `https://api.api4com.com`
- Shotstack proxy Railway: esta URL é de um serviço pessoal do desenvolvedor. Deve ser externalizada para env var ou removida (usar download direto do YouTube)
- Imgur: mover logos para `public/` local (ver §3.8)

---

### 3.7. Arquivos Públicos Corrompidos com Credencial (ALTA PRIORIDADE)

| Arquivo                | Problema                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `public/logo-full.png` | **Não é PNG** — é arquivo HTML contendo `<script>` com token Netlify CWV (`site_id=1562635f-...`, `account_id=5de251a7...`) |
| `public/logo-icon.png` | Mesmo problema                                                                                                              |

**Ação:** Substituir por imagens PNG reais (sem credenciais). Estes arquivos corrompidos causam bug visual E vazam credencial.

---

### 3.8. `index.html` — Facebook SDK e Metadata (NÃO coberto pelo plano existente)

O `index.html` contém:

1. **App ID do Facebook JS SDK hardcoded** (`'1442283340343262'` na linha 28)
2. **URLs do Imgur** para favicon e og:image (linha 5, 14, 17)
3. **Título/metadados** com "Expx Flow"

**Ação:**

- O `FB.init()` deve ler o App ID dinamicamente (injetar via script que busca config do banco, ou usar `import.meta.env.VITE_FACEBOOK_APP_ID`)
- Logos: usar arquivos locais em `public/`
- Metadados: usar valores de `system_config_app` (app_name, etc.) injetados em runtime, ou pelo menos externalizar para `.env`

---

### 3.9. `supabase/config.toml` — Auth Redirect URLs (NÃO coberto pelo plano existente)

```toml
[auth]
site_url = "https://controledetrafego.com.br"                           # L131
additional_redirect_urls = ["https://controledetrafego.com.br/**", "https://expxflow.com.br/**"]  # L132
```

**Ação:** Documentar que o cliente deve alterar `site_url` e `additional_redirect_urls` para seu próprio domínio. Criar um checklist de pós-instalação.

---

### 3.10. `.github/workflows/` — CI/CD do Desenvolvedor

Os workflows contêm referências ao GitHub do desenvolvedor:

- `jules-dispatcher.yml` tem `ALLOWED` list com username
- Vários workflows referenciam o repo específico

**Ação:** Para self-hosting, o cliente provavelmente não usará os mesmos workflows de IA/Jules. Recomenda-se mover `.github/` para um diretório `.github.dev/` (excluído da distribuição) ou documentar que estes workflows são opcionais e específicos do fluxo de desenvolvimento original.

---

## 4. Plano de Configuração: `system_config_*`

### 4.1. Tabelas (já propostas no plano existente)

O plano em `docs/superpowers/plans/2026-04-16-system-config-self-hosting.md` propõe 8 tabelas singleton:

| Tabela                   | Campos                                                                                                                                             | Cobertura                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `system_config_app`      | `app_url`, `app_name`                                                                                                                              | URL e nome da instalação          |
| `system_config_facebook` | `app_id`, `app_secret`                                                                                                                             | Facebook/Meta OAuth               |
| `system_config_google`   | `ads_client_id`, `ads_client_secret`, `ads_developer_token`, `meet_client_id`, `meet_client_secret`, `youtube_api_key`, `gcp_service_account_json` | Google Ads, Meet, YouTube, Slides |
| `system_config_ai`       | `openrouter_api_key`, `openai_api_key`                                                                                                             | Fallback global de IA             |
| `system_config_email`    | `resend_api_key`, `from_email`, `from_name`                                                                                                        | Emails transacionais              |
| `system_config_tools`    | `apify_api_token`, `firecrawl_api_key`, `shotstack_api_key`                                                                                        | Ferramentas de automação          |
| `system_config_discord`  | `bot_token`                                                                                                                                        | Bot Discord (fallback)            |
| `system_config_github`   | `pat`, `repo_owner`, `repo_name`                                                                                                                   | Integração GitHub                 |

### 4.2. Campos adicionais necessários (NÃO no plano existente)

| Tabela                   | Campo adicional     | Motivo                                                   |
| ------------------------ | ------------------- | -------------------------------------------------------- |
| `system_config_tools`    | `youtube_proxy_url` | URL do proxy Railway para download de vídeos             |
| `system_config_tools`    | `api4com_base_url`  | URL base da API4Com (default: `https://api.api4com.com`) |
| `system_config_facebook` | `graph_api_version` | Versão da Graph API (default: `v21.0`)                   |

### 4.3. Helper compartilhado

O helper `_shared/getSystemConfig.ts` (proposto no plano existente) centraliza a leitura:

```typescript
// Prioridade: env var > banco de dados
const apiKey =
  Deno.env.get("OPENROUTER_API_KEY") ?? systemConfig?.openrouter_api_key;
```

**Padrão obrigatório em todas as Edge Functions:**

```typescript
import { getSystemConfig, getAppUrl } from "../_shared/getSystemConfig.ts";

const fbConfig = await getSystemConfig(supabase, "facebook");
const appId = Deno.env.get("FACEBOOK_APP_ID") ?? fbConfig?.app_id;
if (!appId) {
  return errorResponse(
    "Facebook App ID não configurado. Acesse Configurações > Sistema > Facebook.",
  );
}
```

---

## 5. O Que o Plano Existente Já Cobre vs. Lacunas

### Coberto pelo plano `2026-04-16-system-config-self-hosting.md`

- [x] Criação das 8 tabelas `system_config_*` com RLS + GRANT
- [x] Helper `getSystemConfig.ts`
- [x] Migração do `ai-gateway.ts` (OPENROUTER_API_KEY)
- [x] Migração do `facebook-oauth` (App ID/Secret + redirect URL)
- [x] Migração de `fetch-facebook-pages`, `meta-whatsapp-webhook`, `instagram-messaging-webhook`
- [x] Migração de 5 funções de email (resend, invite, magic-link, etc.)
- [x] Migração de `whatsapp-webhook`, `process-whatsapp-notifications`
- [x] Migração de `prospect-apify-maps`, `generate-video-shotstack`, `shotstack-webhook`
- [x] Correção do `client.ts` e `publicClient.ts`
- [x] Correção do `useWhatsAppMediaCache.ts`
- [x] Correção de webhook URLs em 4 componentes
- [x] Correção do `useFacebookIntegration.tsx`
- [x] Hook `useSystemConfig` + página `SystemConfigSettings.tsx`
- [x] Registro de rota `/configuracoes/sistema`

### Lacunas identificadas (NÃO cobertas)

1. **Google Ads + Google Meet** — ~11 Edge Functions lendo só de env vars (§3.4)
2. **YouTube Data API** — `analyze-youtube-channel` (§3.4)
3. **Google Slides Export** — `export-to-google-slides` com `GCP_SERVICE_ACCOUNT_JSON` (§3.4)
4. **Frontend Google** — hooks `useGoogleAdsIntegration` e `useGoogleMeetIntegration` (§3.4)
5. **`index.html`** — FB SDK App ID hardcoded + logos Imgur + metadata (§3.8)
6. **GitHub repo owner/name** — 4 Edge Functions com fallback `bittencourtthulio/controledetrafego` (§3.5)
7. **Cron SQL** — ~14 arquivos com URL + Bearer key hardcoded (§3.1)
8. **`supabase/config.toml`** — `project_id` + auth `site_url`/redirect URLs (§3.1, §3.9)
9. **Railway proxy URL** — Shotstack video download (§3.6)
10. **API4Com base URL** — hardcoded (§3.6)
11. **`test-send-notification`** — URLs hardcoded (§3.2)
12. **`fetch-webpage-content`/`analyze-carousel-from-url`** — User-Agent com domínio (§3.2)
13. **PNGs corrompidos** — `public/logo-full.png` e `public/logo-icon.png` com token Netlify (§3.7)
14. **`.github/workflows/`** — Referências ao desenvolvedor (§3.10)
15. **`README.md`** — GitHub URL do desenvolvedor (§3.10)
16. **`sync-release-notes`** — além do repo, também precisa de config de email/notifications
17. **Naming inconsistency** — `VITE_SUPABASE_PUBLISHABLE_KEY` vs `VITE_SUPABASE_ANON_KEY` (§6.1)
18. **`.env.example`** — não existe, precisa ser criado (§6.2)
19. **Guia de instalação** — não existe (§7)
20. **Discord** — `discord-bot` lê de `discord_config` (per-tenant) + env fallback, mas o fallback env deve ir para `system_config_discord`

---

## 6. Detalhes Técnicos Importantes

### 6.1. Inconsistência de Nome de Env Var

O `.env` define `VITE_SUPABASE_PUBLISHABLE_KEY`, mas vários arquivos leem `VITE_SUPABASE_ANON_KEY`:

- `src/hooks/useClipGenerator.ts` (L125-126)
- `src/hooks/useCarouselGenerationStream.ts` (L38, L81)
- `src/hooks/useSquadChat.ts` (L46, L51-52)
- `src/components/repositorio-criativos/RegenerateCarouselModal.tsx` (L67)
- `src/components/content-planner/ContentPlanEditor.tsx` (L279, L284, L389, L394)
- `src/pages/PublicContentReview.tsx` (L148, L170, L217)

**Ação:** Padronizar em um único nome. Recomendação: `VITE_SUPABASE_ANON_KEY` (mais universal). Atualizar `.env`, `client.ts`, `publicClient.ts` e todos os arquivos que leem a chave.

### 6.2. `.env.example` (criar)

```env
# ── Supabase (OBRIGATÓRIO) ──────────────────────────────
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# ── OAuth Apps (opcional — pode configurar via UI) ──────
VITE_GOOGLE_ADS_CLIENT_ID=
VITE_GOOGLE_MEET_CLIENT_ID=
VITE_FACEBOOK_APP_ID=
```

Todas as demais configs (OpenRouter, Firecrawl, etc.) são via UI em `/configuracoes/sistema` ou via Supabase CLI: `supabase secrets set KEY=value`.

### 6.3. Stragegy: Env Var vs Banco de Dados

| Tipo de config                              | Onde                      | Motivo                                                                       |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Supabase URL + anon key                     | `.env` (Vite)             | Necessário antes do React carregar; não há como buscar do banco sem o client |
| Google/Facebook Client IDs (frontend OAuth) | `.env` (Vite)             | Necessário no redirect do OAuth antes de sessão                              |
| Tudo o demais (secrets, tokens)             | `system_config_*` (banco) | Editável via UI, não exige redeploy                                          |

### 6.4. Cron Jobs — Abordagem Recomendada

Os cron jobs hoje usam `pg_cron` + `net.http_post` com URLs e bearer tokens hardcoded nas migrations. Para self-hosting:

**Opção A (recomendada):** Criar uma Edge Function `setup-cron-jobs` que:

1. Lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` das env vars do runtime (automaticamente disponíveis)
2. Cria os schedules via `pg_cron` usando essas variáveis dinamicamente
3. O cliente chama uma única vez: `supabase functions invoke setup-cron-jobs`

**Opção B:** Converter os arquivos `CONFIGURE_*.sql` em templates com placeholders e documentar que o cliente deve executá-los manualmente após substituir os valores.

---

## 7. Guia de Instalação para Clientes (criar `docs/INSTALACAO.md`)

Este documento deve cobrir:

### 7.1. Pré-requisitos

1. Conta no [Supabase](https://supabase.com) (plano Free ou superior)
2. Conta na [Vercel](https://vercel.com) (plano Free ou superior)
3. Domínio próprio (opcional, mas recomendado)
4. Contas nos serviços de terceiros que deseja usar (OpenRouter, Facebook for Developers, Google Cloud Console, etc.)

### 7.2. Passo a Passo

1. **Clonar o repositório**
2. **Criar projeto Supabase** e anotar URL + anon key + service role key
3. **Aplicar migrations:** `supabase db push`
4. **Deploy das Edge Functions:** `supabase functions deploy`
5. **Configurar secrets do Supabase:** `supabase secrets set ...` (ou pular se for usar a UI)
6. **Configurar variáveis de ambiente do frontend:** copiar `.env.example` para `.env` e preencher
7. **Deploy na Vercel** (ou `npm run build` + servir o `dist/`)
8. **Configurar Auth:** no dashboard do Supabase, definir Site URL e Redirect URLs
9. **Acesso inicial:** criar conta → primeiro usuário vira owner automaticamente
10. **Configurar integrações:** acessar `/configuracoes/sistema` e preencher credenciais

### 7.3. Configuração de Webhooks

Documentar URLs de webhook que o cliente precisa registrar em cada plataforma:

| Plataforma    | Webhook URL                                                                |
| ------------- | -------------------------------------------------------------------------- |
| Facebook App  | `https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-webhook`            |
| Meta WhatsApp | `https://SEU_PROJETO.supabase.co/functions/v1/meta-whatsapp-webhook`       |
| Instagram     | `https://SEU_PROJETO.supabase.co/functions/v1/instagram-messaging-webhook` |
| API4Com       | `https://SEU_PROJETO.supabase.co/functions/v1/api4com-webhook`             |
| Shotstack     | `https://SEU_PROJETO.supabase.co/functions/v1/shotstack-webhook`           |
| Telegram      | Configurado automaticamente via edge function                              |

### 7.4. Lista de Serviços de Terceiros (para o cliente decidir quais usar)

| Serviço                 | Para que serve                              | Onde criar conta            |
| ----------------------- | ------------------------------------------- | --------------------------- |
| OpenRouter              | IA (chat, geração de texto) — **essencial** | openrouter.ai               |
| Facebook for Developers | Facebook Ads, Instagram, WhatsApp           | developers.facebook.com     |
| Google Cloud Console    | Google Ads, Google Meet, YouTube            | console.cloud.google.com    |
| UazapiGO                | WhatsApp não-oficial                        | uazapi.com (ou self-hosted) |
| API4Com                 | Ligações telefônicas                        | api4com.com                 |
| Resend                  | Email transacional                          | resend.com                  |
| Apify                   | Scraping de Google Maps                     | apify.com                   |
| Firecrawl               | Scraping de páginas web                     | firecrawl.dev               |
| Shotstack               | Edição de vídeo                             | shotstack.io                |
| Discord                 | Bot Discord                                 | discord.com/developers      |
| GitHub                  | Issue tracking (opcional)                   | github.com                  |
| ListaCNAE               | Base de leads CNAE                          | listacnae.com.br            |

---

## 8. Breakdown de Trabalho por Prioridade

### P0 — Bloqueador (não pode liberar fontes sem isso)

| #   | Item                                                                            | Esforço | Arquivos |
| --- | ------------------------------------------------------------------------------- | ------- | -------- |
| 1   | Remover Supabase URL/key hardcoded do `client.ts` e `publicClient.ts`           | Pequeno | 2        |
| 2   | Remover Supabase URL hardcoded do `useWhatsAppMediaCache.ts`                    | Pequeno | 1        |
| 3   | Remover project ID do `supabase/config.toml`                                    | Pequeno | 1        |
| 4   | Remover URLs de webhook hardcoded (5 arquivos frontend)                         | Médio   | 5        |
| 5   | Remover domínios hardcoded de todas as Edge Functions (~12)                     | Médio   | 12       |
| 6   | Remover Facebook App ID hardcoded (`useFacebookIntegration.tsx` + `index.html`) | Médio   | 2        |
| 7   | Substituir PNGs corrompidos em `public/`                                        | Pequeno | 2        |
| 8   | Criar `.env.example`                                                            | Pequeno | 1        |
| 9   | Padronizar `VITE_SUPABASE_ANON_KEY` (fix naming)                                | Pequeno | ~8       |
| 10  | Limpar `.env` (remover chaves reais, deixar apenas placeholders)                | Pequeno | 1        |

### P1 — Essencial para self-hosting funcional

| #   | Item                                                          | Esforço | Arquivos                    |
| --- | ------------------------------------------------------------- | ------- | --------------------------- |
| 11  | Criar tabelas `system_config_*` + helper `getSystemConfig.ts` | Médio   | 2 (já planejado)            |
| 12  | Migrar `ai-gateway.ts` para ler do banco                      | Pequeno | 1 (já planejado)            |
| 13  | Migrar funções Facebook/Meta (~5)                             | Médio   | 5 (parcialmente planejado)  |
| 14  | Migrar funções Google Ads (~7)                                | Médio   | 7 (**não planejado**)       |
| 15  | Migrar funções Google Meet (~4)                               | Médio   | 4 (**não planejado**)       |
| 16  | Migrar funções de Email (~5)                                  | Médio   | 5 (já planejado)            |
| 17  | Migrar funções de Ferramentas (Apify, Shotstack, Firecrawl)   | Médio   | ~8 (parcialmente planejado) |
| 18  | Migrar funções de GitHub (~4) — remover fallback              | Pequeno | 4 (**não planejado**)       |
| 19  | Migrar YouTube + Google Slides                                | Pequeno | 2 (**não planejado**)       |
| 20  | Criar página `/configuracoes/sistema` com UI                  | Grande  | 3 (já planejado)            |
| 21  | Converter Cron SQL em templates dinâmicos                     | Médio   | ~14 (**não planejado**)     |

### P2 — Polimento e DX

| #   | Item                                                          | Esforço |
| --- | ------------------------------------------------------------- | ------- |
| 22  | `index.html` — FB SDK init dinâmico + logos locais + metadata | Pequeno |
| 23  | Remover Imgur URLs                                            | Pequeno |
| 24  | Externalizar Railway proxy URL (Shotstack)                    | Pequeno |
| 25  | Externalizar API4Com base URL                                 | Pequeno |
| 26  | Limpar `.github/workflows/` (mover para dev-only)             | Pequeno |
| 27  | Atualizar `README.md` (remover GitHub pessoal)                | Pequeno |
| 28  | Criar `docs/INSTALACAO.md` (guia do cliente)                  | Médio   |
| 29  | Criar checklist de pós-instalação                             | Pequeno |
| 30  | Considerar licença de software (MIT, etc.)                    | Pequeno |

---

## 9. Modelo de Dados de Configuração (Resumo)

```
system_config_app          ← app_url, app_name (URL e nome da instalação)
system_config_facebook     ← app_id, app_secret, graph_api_version
system_config_google       ← ads_client_id, ads_client_secret, ads_developer_token,
                             meet_client_id, meet_client_secret,
                             youtube_api_key, gcp_service_account_json
system_config_ai           ← openrouter_api_key, openai_api_key
system_config_email        ← resend_api_key, from_email, from_name
system_config_tools        ← apify_api_token, firecrawl_api_key, shotstack_api_key,
                             youtube_proxy_url, api4com_base_url
system_config_discord      ← bot_token
system_config_github       ← pat, repo_owner, repo_name
```

**RLS:** Todas as tabelas são singleton (uma linha por instalação). Acesso restrito a owners via `is_system_owner()` (SECURITY DEFINER). Frontend busca apenas indicadores de existência para campos secretos (mesma lógica de `ai_api_keys`).

---

## 10. Checklist de Verificação Final

Após implementar todas as mudanças, executar:

```bash
# 1. Nenhuma string do project ID no frontend
grep -r "ejwpfztkspbvmuwwiwmk" src/ && echo "FALHOU" || echo "OK"

# 2. Nenhum domínio hardcoded no frontend
grep -rE "controledetrafego\.com\.br|expxflow\.com\.br" src/ && echo "FALHOU" || echo "OK"

# 3. Nenhum domínio hardcoded nas Edge Functions (exceto config fallback comentado)
grep -rE "controledetrafego\.com\.br|expxflow\.com\.br" supabase/functions/ && echo "FALHOU" || echo "OK"

# 4. Nenhum App ID hardcoded
grep -rE "1118192076871259|1442283340343262" src/ supabase/ && echo "FALHOU" || echo "OK"

# 5. Nenhum username GitHub hardcoded
grep -r "bittencourtthulio" src/ supabase/ && echo "FALHOU" || echo "OK"

# 6. Nenhuma credencial real no .env
grep -rE "ejwpfztkspbvmuwwiwmk" .env && echo "FALHOU" || echo "OK"

# 7. Build sem erros
npm run build

# 8. .env.example existe
test -f .env.example && echo "OK" || echo "FALHOU"

# 9. PNGs válidos em public/
file public/logo-full.png public/logo-icon.png | grep "PNG image" && echo "OK" || echo "FALHOU"
```

---

## 11. Riscos e Considerações

### 11.1. Rate Limits e Quotas

Cada cliente terá suas próprias contas em cada serviço. Documentar os limites conhecidos:

- OpenRouter: rate limit por API key
- Facebook Graph API: rate limits por App
- Google Ads: limites por Developer Token
- Supabase Free: 500MB DB, 1GB Storage, 50K MAU

### 11.2. Webhooks e IPs

Webhooks recebidos (WhatsApp, Instagram, Facebook, etc.) precisam de URL pública. Cada cliente precisa:

1. Deploy do frontend em domínio acessível
2. Edge Functions deployadas no Supabase
3. Registrar as URLs de webhook em cada plataforma

### 11.3. Atualizações / Versioning

Considerar estratégia para clientes receberem updates:

- Git fork + pull rebase
- Releases versionados no GitHub
- Changelog de migrations SQL (rodar migrations incrementais)

### 11.4. Suporte a Múltiplas Empresas (Multi-tenant dentro de uma Instância)

O sistema já suporta múltiplas empresas (companies) dentro de uma instalação. Cada empresa pode ter:

- Sua própria chave OpenRouter (`ai_api_keys`)
- Seu próprio WhatsApp (`whatsapp_configs`, `whatsapp_instances`)
- Seu próprio Discord (`discord_config`)
- Seus próprios tokens de integração

As configs globais (`system_config_*`) servem como **fallback/padrão** para todas as empresas da instalação. Uma empresa pode override com suas próprias chaves.

### 11.5. Sharing de Contas vs. Isolamento Total

O modelo atual é:

- **OAuth apps (Facebook, Google)** = globais por instalação (`system_config_*`)
- **Tokens obtidos via OAuth** = por empresa (cada empresa conecta sua conta de anúncios)
- **Chaves de API diretas (OpenRouter, etc.)** = por empresa (cada empresa usa sua chave)

Isso significa que se dois clientes (instalações diferentes) quiserem usar o mesmo Facebook App, cada um precisa criar o seu. Não há compartilhamento entre instalações. **Isso é o comportamento desejado para self-hosting.**

---

## 12. Ordem de Execução Recomendada

```
Fase 1 — Preparação (1-2 dias)
  ├── Criar system_config_* + getSystemConfig.ts
  ├── Criar .env.example
  └── Padronizar VITE_SUPABASE_ANON_KEY

Fase 2 — Eliminar Hardcoded (2-3 dias)
  ├── Frontend: client.ts, publicClient.ts, hooks, componentes
  ├── index.html (FB SDK, logos, metadata)
  ├── public/ PNGs corrompidos
  └── .env (limpar credenciais reais)

Fase 3 — Migrar Edge Functions (3-5 dias)
  ├── Facebook/Meta (~5 funções)
  ├── Google Ads + Meet (~11 funções)
  ├── Email (~5 funções)
  ├── Ferramentas (~8 funções)
  ├── GitHub (~4 funções)
  └── YouTube + Google Slides (~2 funções)

Fase 4 — Cron e Config (1-2 dias)
  ├── Converter CONFIGURE_*.sql em templates
  ├── config.toml (documentar auth URLs)
  └── Criar setup-cron-jobs (opcional)

Fase 5 — UI e Docs (2-3 dias)
  ├── Página /configuracoes/sistema (já planejada)
  ├── docs/INSTALACAO.md
  ├── README.md atualizado
  └── Checklist de verificação

Fase 6 — Limpeza (0.5 dia)
  ├── .github/workflows/ (dev-only)
  ├── Remover arquivos órfãos
  └── Verificação final (grep + build)
```

**Estimativa total: 10-15 dias de trabalho focado.**

---

_Documento gerado em 17/06/2026. Baseado em análise completa do repositório `controledetrafego` (Expx Flow) com 215 Edge Functions, 490+ migrations, 114 páginas e 236 hooks._
