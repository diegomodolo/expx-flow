# Sprint 2 — P1 Essencial (Edge Functions + Cron + UI)

> **Objetivo do sprint:** Após o gate, o self-hosting é **funcional**: todas as Edge Functions leem credenciais do banco (padrão `env > banco`), o cron é configurável pelo cliente, e existe a UI `/configuracoes/sistema` para o owner preencher tudo.
> **Pré-requisito:** Sprint 1 com gate fechado (helper `getSystemConfig` + harness Deno + tabelas mergeados e verdes).
> **TDD:** cada função migrada tem `Deno.test` afirmando a resolução `env > banco > erro graceful`, usando o mock da Fase 1.1. Ver [`00-ORQUESTRACAO.md`](./00-ORQUESTRACAO.md) §4.2.

**Fases:** (2.1 ∥ 2.2 ∥ 2.3 ∥ 2.4) → (2.5 ∥ 2.6) → Gate de Sprint 2. As fases 2.1–2.4 tocam arquivos disjuntos e rodam em paralelo (sub-agents `backend` concorrentes).

### Padrão de migração (aplicado em TODA task de Edge Function)

```typescript
import { getSystemConfig, getAppUrl, resolveCredential } from "../_shared/getSystemConfig.ts";

const cfg = await getSystemConfig(supabase, "<provider>");
const value = resolveCredential(Deno.env.get("<ENV>"), cfg?.<campo>,
  "<Mensagem PT-BR: Configure em Configurações > Sistema > ...>");
// URLs de domínio: const appUrl = getAppUrl(await getSystemConfig(supabase,"app"), req);
```

### Modelo de TDD por função (RED→GREEN→REFACTOR)

- **RED:** `Deno.test` com mock semeando `system_config_<provider>`; afirma: (1) env var presente → usa env; (2) env ausente + banco presente → usa banco; (3) ambos ausentes → erro graceful em PT-BR; (4) quando aplicável, URL de redirect/email/webhook derivada de `app_url`/origin, sem domínio hardcoded. Falha contra a função atual.
- **GREEN:** aplicar o padrão acima; remover env-only e domínios hardcoded.
- **REFACTOR:** extrair lógica de credencial/URL para módulo puro se o handler ficar grande.
- **Deploy + smoke:** `supabase functions deploy <nome>` (uma por vez) + invocação smoke.

---

## Fase 2.1 — Facebook / Meta (agente: `backend` + `auth`)

### Task 2.1.1 — `facebook-oauth`

- **Arquivos:** `supabase/functions/facebook-oauth/index.ts`
- **Foco:** `app_id`/`app_secret` de `system_config_facebook`; `redirectUri = ${getAppUrl(appCfg,req)}/auth/callback`; remover branch `origin.includes("expxflow"/"controledetrafego")`. `auth` valida o fluxo de redirect.
- **Aceite:** [ ] 4 casos TDD verdes · [ ] sem domínio/App ID hardcoded no arquivo · [ ] deploy + smoke OK.
- **Commit:** `feat: facebook-oauth reads config from system_config + dynamic redirect`

### Task 2.1.2 — `fetch-facebook-pages`, `meta-whatsapp-webhook`, `instagram-messaging-webhook`

- **Arquivos:** os 3 acima.
- **Foco:** `app_secret`/`app_id` do banco; webhooks usam `graph_api_version` do banco (default v21.0).
- **Aceite:** [ ] TDD por arquivo verde · [ ] greps de domínio/App ID vazios · [ ] deploy + smoke dos 3.
- **Commit:** `feat: meta edge functions read config from system_config_facebook`

> Skill de contexto a atualizar ao fim da fase: `publicacao-social` (se tocada).

---

## Fase 2.2 — Google Ads + Meet + YouTube + Slides (agente: `backend`)

### Task 2.2.1 — Google Ads (~7 funções) via `system_config_google`

- **Arquivos:** `google-ads-oauth`, `sync-google-ads-campaigns`, `google-ads-fetch-account`, `google-ads-keyword-planner`, `manage-google-ads-sync-schedule`, `fetch-realtime-metrics`, `_shared/googleAdsTokenRefresh.ts`
- **Foco:** `ads_client_id`/`ads_client_secret`/`ads_developer_token` do banco com fallback env. O helper `_shared/googleAdsTokenRefresh.ts` deve receber as credenciais resolvidas (parâmetro) ou resolvê-las via `getSystemConfig` — testar o helper isoladamente.
- **Aceite:** [ ] TDD do helper + de cada função (3 casos) verdes · [ ] deploy + smoke do oauth e de um sync · [ ] sem env-only.
- **Commit:** `feat: google ads functions read credentials from system_config_google`

### Task 2.2.2 — Google Meet (~4 funções)

- **Arquivos:** `google-meet-oauth`, `google-meet-create`, `google-meet-check-transcript`, `google-meet-process-summary`
- **Foco:** `meet_client_id`/`meet_client_secret` do banco.
- **Aceite:** [ ] TDD verde · [ ] deploy + smoke do oauth + create.
- **Commit:** `feat: google meet functions read credentials from system_config_google`

### Task 2.2.3 — YouTube + Google Slides

- **Arquivos:** `analyze-youtube-channel` (`youtube_api_key`), `export-to-google-slides` (`gcp_service_account_json`)
- **Foco:** ler do banco; `gcp_service_account_json` parseado com erro graceful se inválido.
- **Aceite:** [ ] TDD verde (inclui JSON inválido → erro PT-BR) · [ ] deploy + smoke.
- **Commit:** `feat: youtube + slides functions read credentials from system_config_google`

> Skills de contexto: criar/atualizar a do módulo Google se concluído (não existe hoje — candidata a `google-integracoes`).

---

## Fase 2.3 — Email + Ferramentas (agente: `backend`)

### Task 2.3.1 — Email (~5 funções) via `system_config_email` + `app_url`

- **Arquivos:** `resend-employee-invite`, `invite-employee`, `create-employee-user`, `invite-with-magic-link`, `send-presentation-summary`
- **Foco:** `resend_api_key`/`from_email`/`from_name` do banco; `redirectTo`/links via `getAppUrl`; remover `sistema@controledetrafego.com.br` / `noreply@expxflow.com.br` e domínios.
- **Aceite:** [ ] TDD por função (3 casos + URL dinâmica) verde · [ ] greps de domínio vazios nas 5 · [ ] deploy + smoke de um convite.
- **Commit:** `feat: email functions read system_config_email + dynamic app_url`

### Task 2.3.2 — Ferramentas: Apify, Shotstack, Firecrawl, WhatsApp app_url (~8 funções)

- **Arquivos:** `prospect-apify-maps`, `generate-video-shotstack`, `shotstack-webhook`, `whatsapp-webhook`, `process-whatsapp-notifications`, `test-send-notification`, + funções Firecrawl que leem `FIRECRAWL_API_KEY`.
- **Foco:** `apify_api_token`/`shotstack_api_key`/`firecrawl_api_key` do banco; `whatsapp-webhook` e `process-whatsapp-notifications` usam `app_url` do banco nos links; `test-send-notification` sem URLs hardcoded.
- **Aceite:** [ ] TDD verde · [ ] grep de domínio vazio em todas · [ ] deploy + smoke.
- **Commit:** `feat: tool/whatsapp functions read system_config_tools + dynamic app_url`

> Skill de contexto a atualizar: `publicacao-social`, `ligacoes-api4com` (parcial — base URL fica na 3.1).

---

## Fase 2.4 — GitHub + Discord (agente: `backend`)

### Task 2.4.1 — GitHub (~4 funções): remover fallback do dev, integração opcional

- **Arquivos:** `sync-release-notes`, `create-github-issue`, `fetch-github-issue-status`, `auto-report-error`
- **Foco:** ler `repo_owner`/`repo_name`/`pat` de `system_config_github`. **Remover** `|| "bittencourtthulio"` e `|| "controledetrafego"`. Sem config → **erro graceful** ("Integração GitHub não configurada"), nunca repo do dev. `sync-release-notes` também usa config de email/notifications.
- **Aceite:** [ ] TDD: sem config → erro graceful (não usa repo do dev); com config → usa banco · [ ] `grep bittencourtthulio supabase/functions/` vazio · [ ] deploy + smoke.
- **Commit:** `feat: github functions read system_config_github, no dev fallback`

### Task 2.4.2 — Discord: mover fallback env para `system_config_discord`

- **Arquivos:** `discord-bot` (e correlatas que leem `DISCORD_BOT_TOKEN`)
- **Foco:** per-tenant continua em `discord_config`; o **fallback global** passa a ler `system_config_discord.bot_token` em vez de env-only.
- **Aceite:** [ ] TDD: per-tenant > system_config_discord > erro graceful · [ ] deploy + smoke.
- **Commit:** `feat: discord fallback reads system_config_discord`

---

## Fase 2.5 — Cron parametrizado (agente: `devops` + `backend`)

### Task 2.5.1 — `setup-cron-jobs` (Opção A) + templates (Opção B)

- **Arquivos:** `supabase/functions/setup-cron-jobs/index.ts`, `supabase/config.toml` (entrada), `supabase/CONFIGURE_*.sql` (→ templates), nova migration que substitui schedules hardcoded das migrations antigas.
- **Foco:** `setup-cron-jobs` lê `SUPABASE_URL`/`SUPABASE_ANON_KEY` do runtime e cria todos os schedules via `cron.schedule` + `net.http_post` parametrizado. Os `CONFIGURE_*.sql` viram templates com `<SUA_SUPABASE_URL>`/`<SUA_ANON_KEY>`. Migrations já aplicadas **não** são editadas — nova migration incremental.
- **TDD:**
  - RED: `Deno.test` afirmando que o SQL gerado por `setup-cron-jobs` (a) cria os N schedules esperados e (b) **não** contém literais de URL/bearer (monta a partir das envs). Falha.
  - GREEN: implementar a função e os templates.
  - REFACTOR: lista de jobs como dados, não código duplicado.
- **Aceite:** [ ] TDD verde · [ ] `grep -rE "ejwpfztkspbvmuwwiwmk|Bearer eyJ" supabase/CONFIGURE_*.sql supabase/functions/setup-cron-jobs/` vazio (só placeholders/envs) · [ ] smoke: invocar `setup-cron-jobs` num projeto novo registra jobs em `cron.job`.
- **Commit:** `feat: setup-cron-jobs + parametrized cron templates (no hardcoded url/bearer)`

---

## Fase 2.6 — UI de Configurações do Sistema (agente: `frontend` + `auth` + `testing`)

### Task 2.6.1 — Hook `useSystemConfig` + `useUpsertSystemConfig`

- **Arquivos:** `src/hooks/useSystemConfig.ts`
- **TDD:**
  - RED: testes (Supabase mockado) afirmando: `useSystemConfig("ai")` lê a linha; upsert remove campos vazios (não sobrescreve com null); invalida `["system_config", provider]`; toast de sucesso/erro. Falha.
  - GREEN: implementar (base: plano histórico Task 13).
  - REFACTOR: tipar provider.
- **Aceite:** [ ] testes verdes · [ ] `npm run build` ok.
- **Commit:** `feat: useSystemConfig + useUpsertSystemConfig hooks`

### Task 2.6.2 — `SystemConfigSettings.tsx` (8 tabs, SecretField, owner-only)

- **Arquivos:** `src/components/settings/SystemConfigSettings.tsx`
- **TDD:**
  - RED: testes afirmando: owner vê as 8 tabs; colaborador vê "acesso negado"; submeter o form de `app` chama upsert com os valores; SecretField alterna show/hide. Falha.
  - GREEN: implementar (base: plano histórico Task 14) — incluir os campos adicionais do §4.2 (graph_api_version, youtube_proxy_url, api4com_base_url).
  - REFACTOR: form genérico por provider.
- **Aceite:** [ ] testes verdes (owner/colaborador/submit) · [ ] React Hook Form + Zod · [ ] `npm run build` ok.
- **Commit:** `feat: SystemConfigSettings with tabs for all integrations (owner-only)`

### Task 2.6.3 — Rota `/configuracoes/sistema` + entrada no menu (agente: `auth`/`permissions`)

- **Arquivos:** `src/pages/Configuracoes.tsx`, `src/components/settings/SettingsLayout.tsx`
- **TDD:**
  - RED: teste de roteamento afirmando que `/configuracoes/sistema` renderiza `SystemConfigSettings` e que a entrada "Sistema" aparece no nav. Falha.
  - GREEN: registrar rota + item de menu (`Settings2`).
  - REFACTOR: —
- **Aceite:** [ ] teste verde · [ ] `permissions` valida consistência rota × menu · [ ] owner acessa, colaborador bloqueado · [ ] build ok.
- **Commit:** `feat: add /configuracoes/sistema route + nav entry`

> **Skill de contexto (obrigatória ao fim do módulo, rule global #10):** criar `.claude/skills/self-hosting/SKILL.md` cobrindo o padrão `env > banco`, `getSystemConfig`, as 8 tabelas e a UI.

---

## Gate de Sprint 2 (bloqueia Sprint 3)

- [ ] `deno test supabase/functions/` **verde** (todas as suites: helper + cada grupo migrado + setup-cron-jobs).
- [ ] `npm run test:ci` verde, incluindo UI (hooks + SystemConfigSettings + rota).
- [ ] **Guard test 100% verde** (todos os skips do Sprint 1 removidos; patterns de `supabase/` zerados):
  - [ ] `grep -rE "controledetrafego\.com\.br|expxflow\.com\.br" supabase/functions/` **vazio**.
  - [ ] `grep -r "bittencourtthulio" src/ supabase/` **vazio**.
- [ ] `npm run build` + `npm run lint` limpos.
- [ ] Todas as Edge Functions alteradas deployadas com smoke-test OK.
- [ ] **Smoke-test (§6.3 do main):** owner salva IA+Email+Facebook em `/configuracoes/sistema`; chamada de IA usa chave do banco; convite usa `from_email` do banco; `setup-cron-jobs` registra jobs.
- [ ] Skill `self-hosting` criada.
- [ ] Commit + push na `main`.
